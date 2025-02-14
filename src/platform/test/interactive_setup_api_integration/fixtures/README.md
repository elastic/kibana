## Certificate generation

The Elasticsearch HTTP layer keystore is supposed to mimic the PKCS12 keystore that the elasticsearch startup script will auto-generate for a node. The keystore contains:

- A PrivateKeyEntry for the node's key and certificate for the HTTP layer
- A PrivateKeyEntry for the CA's key and certificate
- A TrustedCertificateEntry for the CA's certificate

__IMPORTANT:__ CA keystore (ca.p12) is not checked in intentionally, talk to @elastic/kibana-security if you need it to sign new certificates.

```bash
ROOT_CA_PATH='packages/kbn-dev-utils/certs/ca.p12'
ROOT_CA_NAME='root'
INTERMEDIATE_CA_NAME='intermediate'
INSTANCE_NAME='elasticsearch'

# Create intermediate CA
bin/elasticsearch-certutil ca --ca-dn "CN=Elastic Intermediate CA" -days 18250 --out $INTERMEDIATE_CA_NAME.p12 --pass castorepass

# Create instance certificate
bin/elasticsearch-certutil cert \
  --ca $INTERMEDIATE_CA_NAME.p12 --ca-pass castorepass --name $INSTANCE_NAME \
  --dns=localhost --dns=localhost.localdomain \
  --dns=localhost4 --dns=localhost4.localdomain4 \
  --dns=localhost6 --dns=localhost6.localdomain6 \
  --ip=127.0.0.1 --ip=0:0:0:0:0:0:0:1 \
  -days 18250 --out $INSTANCE_NAME.p12 --pass storepass

# Convert P12 keystores to PEM files
openssl pkcs12 -in $ROOT_CA_PATH -out $ROOT_CA_NAME.crt -nokeys -passin pass:castorepass -passout pass:
openssl pkcs12 -in $ROOT_CA_PATH -nocerts -passin pass:castorepass -passout pass:keypass | openssl rsa -passin pass:keypass -out $ROOT_CA_NAME.key

openssl pkcs12 -in $INTERMEDIATE_CA_NAME.p12 -out $INTERMEDIATE_CA_NAME.crt -nokeys -passin pass:castorepass -passout pass:
openssl pkcs12 -in $INTERMEDIATE_CA_NAME.p12 -nocerts -passin pass:castorepass -passout pass:keypass | openssl rsa -passin pass:keypass -out $INTERMEDIATE_CA_NAME.key

openssl pkcs12 -in $INSTANCE_NAME.p12 -out $INSTANCE_NAME.crt -clcerts -passin pass:storepass -passout pass:
openssl pkcs12 -in $INSTANCE_NAME.p12 -nocerts -passin pass:storepass -passout pass:keypass | openssl rsa -passin pass:keypass -out $INSTANCE_NAME.key

# Re-sign intermediate CA
mkdir -p ./tmp
openssl x509 -x509toreq -in $INTERMEDIATE_CA_NAME.crt -signkey $INTERMEDIATE_CA_NAME.key -out ./tmp/$INTERMEDIATE_CA_NAME.csr
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
certificate     = ./$ROOT_CA_NAME.crt
serial          = ./tmp/serial
crlnumber       = ./tmp/crlnumber
crl             = ./tmp/crl.pem
private_key     = ./$ROOT_CA_NAME.key
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

openssl ca -batch -config ./tmp/openssl.cnf -name tmpcnf -in ./tmp/$INTERMEDIATE_CA_NAME.csr -out $INTERMEDIATE_CA_NAME.crt

# Convert PEM files back to P12 keystores
cat $INTERMEDIATE_CA_NAME.key $INTERMEDIATE_CA_NAME.crt $ROOT_CA_NAME.crt | openssl pkcs12 -export -name $INTERMEDIATE_CA_NAME -passout pass:castorepass -out $INTERMEDIATE_CA_NAME.p12
cat $INSTANCE_NAME.key $INSTANCE_NAME.crt $ROOT_CA_NAME.crt $INTERMEDIATE_CA_NAME.crt | openssl pkcs12 -export -name $INSTANCE_NAME -passout pass:storepass -out $INSTANCE_NAME.p12

# Verify contents of keystores
openssl pkcs12 -info -in $INTERMEDIATE_CA_NAME.p12 -passin pass:"castorepass" -nodes
openssl pkcs12 -info -in $INSTANCE_NAME.p12 -passin pass:"storepass" -nodes

# Change the alias of the TrustedCertificateEntry so that it won't clash with the CA PrivateKeyEntry
keytool -changealias -alias ca -destalias cacert -keystore \
  $INSTANCE_NAME.p12 \
  -deststorepass "storepass"

# Import the CA PrivateKeyEntry
keytool -importkeystore \
  -srckeystore $ROOT_CA_PATH \
  -srcstorepass "castorepass" \
  -destkeystore $INSTANCE_NAME.p12 \
  -deststorepass "storepass"
```
