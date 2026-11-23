# Development certificates

Kibana includes several development certificates to enable easy setup of TLS-encrypted communications with Elasticsearch.

_Note: these certificates should **never** be used in production._

## Certificate information

Certificates and keys are provided in multiple formats. These can be used by other packages to set up a new Elastic Stack with Kibana and Elasticsearch. The Certificate Authority (CA) private key is intentionally omitted from this package.

### PEM 

* `ca.crt` -- A [PEM-formatted](https://tools.ietf.org/html/rfc1421) [X.509](https://tools.ietf.org/html/rfc5280) certificate that is used as a CA.
* `elasticsearch.crt` -- A PEM-formatted X.509 certificate and public key for Elasticsearch.
* `elasticsearch.key` -- A PEM-formatted [PKCS #1](https://tools.ietf.org/html/rfc8017) private key for Elasticsearch.
* `kibana.crt` -- A PEM-formatted X.509 certificate and public key for Kibana.
* `kibana.key` -- A PEM-formatted PKCS #1 private key for Kibana.
* `pki_intermediate_ca.crt` -- A PEM-formatted X.509 certificate for an intermediate CA, signed by `ca.crt`.
* `pki_intermediate_ca_2.crt` -- A PEM-formatted X.509 certificate for a second intermediate CA, signed by `pki_intermediate_ca.crt`.
* `pki_intermediate_client.crt` / `.key` -- A PKI client certificate signed by `pki_intermediate_ca.crt`, and its PKCS #8 private key.
* `pki_intermediate_2_client.crt` / `.key` -- A PKI client certificate signed by `pki_intermediate_ca_2.crt`, and its PKCS #8 private key.
* `pki_untrusted_ca.crt` -- A PEM-formatted X.509 certificate for a throwaway root CA that nothing trusts.
* `pki_untrusted_client.crt` / `.key` -- A PKI client certificate signed by `pki_untrusted_ca.crt`, and its PKCS #8 private key.

### PKCS #12

* `elasticsearch.p12` -- A [PKCS #12](https://tools.ietf.org/html/rfc7292) encrypted key store / trust store that contains `ca.crt`, `elasticsearch.crt`, and a [PKCS #8](https://tools.ietf.org/html/rfc5208) encrypted version of `elasticsearch.key`.
* `kibana.p12` -- A PKCS #12 encrypted key store / trust store that contains `ca.crt`, `kibana.crt`, and a PKCS #8 encrypted version of `kibana.key`.

The password used for both of these is "storepass". Other copies are also provided for testing purposes:

* `elasticsearch_emptypassword.p12` -- The same PKCS #12 key store, encrypted with an empty password.
* `elasticsearch_nopassword.p12` -- The same PKCS #12 key store, not encrypted with a password.

## Certificate generation

[Elasticsearch cert-util](https://www.elastic.co/guide/en/elasticsearch/reference/current/certutil.html) and [OpenSSL](https://www.openssl.org/) were used to generate these certificates. The following commands were used from the root directory of Elasticsearch:

__IMPORTANT:__ CA keystore (ca.p12) is not checked in intentionally, talk to @elastic/kibana-security if you need it to sign new certificates.

```
# Generate the PKCS #12 keystore for a CA, valid for 50 years
bin/elasticsearch-certutil ca --out ca.p12 -days 18250 --pass castorepass

# Generate the PKCS #12 keystore for Elasticsearch and sign it with the CA
bin/elasticsearch-certutil cert --out elasticsearch.p12 -days 18250 --ca ca.p12 --ca-pass castorepass --name elasticsearch --dns localhost,host.docker.internal,es01,es02,es03 --pass storepass

# Generate the PKCS #12 keystore for Kibana and sign it with the CA
bin/elasticsearch-certutil cert --out kibana.p12 -days 18250 --ca ca.p12 --ca-pass castorepass --name kibana --dns localhost,host.docker.internal,es01,es02,es03 --pass storepass

# Generate the PKCS #12 keystore for Fleet Server and sign it with the CA
bin/elasticsearch-certutil cert --out fleet_server.p12 -days 18250 --ca ca.p12 --ca-pass castorepass --name fleet_server --dns localhost,host.docker.internal,es01,es02,es03 --pass storepass

# Copy the PKCS #12 keystore for Elasticsearch with an empty password
openssl pkcs12 -in elasticsearch.p12 -nodes -passin pass:"storepass" -passout pass:"" | openssl pkcs12 -export -legacy -out elasticsearch_emptypassword.p12 -passout pass:""

# Manually create "elasticsearch_nopassword.p12" -- this can be done on macOS by importing the P12 key store into the Keychain and exporting it again

# Extract the PEM-formatted X.509 certificate for the CA
openssl pkcs12 -in elasticsearch.p12 -out ca.crt -cacerts -passin pass:"storepass" -passout pass:

# Extract the PEM-formatted PKCS #1 private key for Elasticsearch
openssl pkcs12 -in elasticsearch.p12 -nocerts -passin pass:"storepass" -passout pass:"keypass" | openssl rsa -passin pass:keypass -out elasticsearch.key -traditional

# Extract the PEM-formatted X.509 certificate for Elasticsearch
openssl pkcs12 -in elasticsearch.p12 -out elasticsearch.crt -clcerts -passin pass:"storepass" -passout pass:

# Extract the PEM-formatted PKCS #1 private key for Kibana
openssl pkcs12 -in kibana.p12 -nocerts -passin pass:"storepass" -passout pass:"keypass" | openssl rsa -passin pass:keypass -out kibana.key -traditional

# Extract the PEM-formatted X.509 certificate for Kibana
openssl pkcs12 -in kibana.p12 -out kibana.crt -clcerts -passin pass:"storepass" -passout pass:

# Extract the PEM-formatted PKCS #1 private key for Fleet Server
openssl pkcs12 -in fleet_server.p12 -nocerts -passin pass:"storepass" -passout pass:"keypass" | openssl rsa -passin pass:keypass -out fleet_server.key -traditional

# Extract the PEM-formatted X.509 certificate for Fleet Server
openssl pkcs12 -in fleet_server.p12 -out fleet_server.crt -clcerts -passin pass:"storepass" -passout pass:
```

### PKI certificate chain

The `pki_*` certificates test PKI authentication with client certificates issued by an intermediate CA,
where Kibana and Elasticsearch trust only `ca.crt` and the client sends its intermediates itself. They
are generated with OpenSSL, because `elasticsearch-certutil` can't issue an intermediate CA. The CA keys
(the root, both intermediates and the untrusted root) are not checked in, so no one can issue new
certificates that chain to `ca.crt` from this directory.

Write `pki_chain.cnf`:

```
[req]
default_bits       = 2048
default_md         = sha256
prompt             = no
distinguished_name = dn

[dn]
CN = placeholder

[v3_intermediate_ca]
basicConstraints       = critical, CA:TRUE, pathlen:1
keyUsage               = critical, keyCertSign, cRLSign
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always

[v3_intermediate_ca_2]
basicConstraints       = critical, CA:TRUE, pathlen:0
keyUsage               = critical, keyCertSign, cRLSign
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always

[v3_untrusted_ca]
basicConstraints       = critical, CA:TRUE
keyUsage               = critical, keyCertSign, cRLSign
subjectKeyIdentifier   = hash

[v3_client]
basicConstraints       = CA:FALSE
keyUsage               = critical, digitalSignature, keyEncipherment
extendedKeyUsage       = clientAuth
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always
```

Then generate them, valid for 16,000 days so they expire before `ca.crt` does:

```
# Extract the CA certificate and key from ca.p12
openssl pkcs12 -in ca.p12 -passin pass:"castorepass" -nokeys -clcerts -out ca_signing.crt
openssl pkcs12 -in ca.p12 -passin pass:"castorepass" -nocerts -nodes -out ca_signing.key

# Intermediate CA, signed by the dev root CA
openssl req -new -newkey rsa:2048 -nodes -keyout pki_intermediate_ca.key -subj "/CN=Kibana PKI Test Intermediate CA" -out pki_intermediate_ca.csr -config pki_chain.cnf
openssl x509 -req -in pki_intermediate_ca.csr -CA ca_signing.crt -CAkey ca_signing.key -CAcreateserial -out pki_intermediate_ca.crt -days 16000 -sha256 -extfile pki_chain.cnf -extensions v3_intermediate_ca

# Second intermediate CA, signed by the first one
openssl req -new -newkey rsa:2048 -nodes -keyout pki_intermediate_ca_2.key -subj "/CN=Kibana PKI Test Intermediate CA 2" -out pki_intermediate_ca_2.csr -config pki_chain.cnf
openssl x509 -req -in pki_intermediate_ca_2.csr -CA pki_intermediate_ca.crt -CAkey pki_intermediate_ca.key -CAcreateserial -out pki_intermediate_ca_2.crt -days 16000 -sha256 -extfile pki_chain.cnf -extensions v3_intermediate_ca_2

# Client signed by the first intermediate CA
openssl req -new -newkey rsa:2048 -nodes -keyout pki_intermediate_client.key -subj "/CN=pki_intermediate_client" -out pki_intermediate_client.csr -config pki_chain.cnf
openssl x509 -req -in pki_intermediate_client.csr -CA pki_intermediate_ca.crt -CAkey pki_intermediate_ca.key -CAcreateserial -out pki_intermediate_client.crt -days 16000 -sha256 -extfile pki_chain.cnf -extensions v3_client

# Client signed by the second intermediate CA
openssl req -new -newkey rsa:2048 -nodes -keyout pki_intermediate_2_client.key -subj "/CN=pki_intermediate_2_client" -out pki_intermediate_2_client.csr -config pki_chain.cnf
openssl x509 -req -in pki_intermediate_2_client.csr -CA pki_intermediate_ca_2.crt -CAkey pki_intermediate_ca_2.key -CAcreateserial -out pki_intermediate_2_client.crt -days 16000 -sha256 -extfile pki_chain.cnf -extensions v3_client

# Client signed by a throwaway root CA that nothing trusts
openssl req -x509 -newkey rsa:2048 -nodes -keyout pki_untrusted_ca.key -subj "/CN=Kibana PKI Test Untrusted CA" -out pki_untrusted_ca.crt -days 16000 -sha256 -config pki_chain.cnf -extensions v3_untrusted_ca
openssl req -new -newkey rsa:2048 -nodes -keyout pki_untrusted_client.key -subj "/CN=pki_untrusted_client" -out pki_untrusted_client.csr -config pki_chain.cnf
openssl x509 -req -in pki_untrusted_client.csr -CA pki_untrusted_ca.crt -CAkey pki_untrusted_ca.key -CAcreateserial -out pki_untrusted_client.crt -days 16000 -sha256 -extfile pki_chain.cnf -extensions v3_client
```

Copy only the files listed above into this directory. Discard the CA keys, CSRs and serial files.
