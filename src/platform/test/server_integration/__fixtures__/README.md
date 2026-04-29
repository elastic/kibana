# HTTP SSL Test Fixtures

These PKCS12 files are used to test SSL with a root CA and an intermediate CA.

The files that are provided by `@kbn/dev-utils` only use a root CA, so we need additional test files for this.

To generate these additional test files, see the steps below.

## Step 1. Set environment variables

```sh
CA1='test_root_ca'
CA2='test_intermediate_ca'
EE='localhost'
```

## Step 2. Generate PKCS12 key stores

Using [elasticsearch-certutil](https://www.elastic.co/guide/en/elasticsearch/reference/current/certutil.html):

```sh
bin/elasticsearch-certutil ca --ca-dn "CN=Test Root CA" -days 18250 --out $CA1.p12 --pass castorepass
bin/elasticsearch-certutil ca --ca-dn "CN=Test Intermediate CA" -days 18250 --out $CA2.p12 --pass castorepass
bin/elasticsearch-certutil cert --ca $CA2.p12 --ca-pass castorepass --name $EE --dns $EE --out $EE.p12 --pass storepass
```

## Step 3. Convert PKCS12 key stores

Using OpenSSL on macOS:

```sh
### CONVERT P12 KEYSTORES TO PEM FILES
openssl pkcs12 -in $CA1.p12 -out $CA1.crt -nokeys -passin pass:"castorepass" -passout pass:
openssl pkcs12 -in $CA1.p12 -nocerts -passin pass:"castorepass" -passout pass:"keypass" | openssl rsa -passin pass:"keypass" -out $CA1.key

openssl pkcs12 -in $CA2.p12 -out $CA2.crt -nokeys -passin pass:"castorepass" -passout pass:
openssl pkcs12 -in $CA2.p12 -nocerts -passin pass:"castorepass" -passout pass:"keypass" | openssl rsa -passin pass:"keypass" -out $CA2.key

openssl pkcs12 -in $EE.p12 -out $EE.crt -clcerts -passin pass:"storepass" -passout pass:
openssl pkcs12 -in $EE.p12 -nocerts -passin pass:"storepass" -passout pass:"keypass" | openssl rsa -passin pass:"keypass" -out $EE.key

### RE-SIGN INTERMEDIATE CA CERT
mkdir -p ./tmp
openssl x509 -x509toreq -in $CA2.crt -signkey $CA2.key -out ./tmp/$CA2.csr
dd if=/dev/urandom of=./tmp/rand bs=256 count=1
touch ./tmp/index.txt
echo "01" > ./tmp/serial
cp /System/Library/OpenSSL/openssl.cnf ./tmp/
echo "
[ tmpcnf ]
dir             = ./
certs           = ./
new_certs_dir   = ./tmp
crl_dir         = ./tmp/crl
database        = ./tmp/index.txt
unique_subject  = no
certificate     = ./$CA1.crt
serial          = ./tmp/serial
crlnumber       = ./tmp/crlnumber
crl             = ./tmp/crl.pem
private_key     = ./$CA1.key
RANDFILE        = ./tmp/rand
x509_extensions = v3_ca
name_opt        = ca_default
cert_opt        = ca_default
default_days    = 18250
default_crl_days= 30
default_md      = sha256
preserve        = no
policy          = policy_anything
" >> ./tmp/openssl.cnf

# The next command requires user input
openssl ca -config ./tmp/openssl.cnf -name tmpcnf -in ./tmp/$CA2.csr -out $CA2.crt -verbose

### CONVERT PEM FILES BACK TO P12 KEYSTORES
cat $CA2.key $CA2.crt $CA1.crt | openssl pkcs12 -export -name $CA2 -passout pass:"castorepass" -out $CA2.p12
cat $EE.key $EE.crt $CA1.crt $CA2.crt | openssl pkcs12 -export -name $EE -passout pass:"storepass" -out $EE.p12
```
