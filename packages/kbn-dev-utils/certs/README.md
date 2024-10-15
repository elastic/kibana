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
bin/elasticsearch-certutil cert --out elasticsearch.p12 -days 18250 --ca ca.p12 --ca-pass castorepass --name elasticsearch --dns localhost --pass storepass

# Generate the PKCS #12 keystore for Kibana and sign it with the CA
bin/elasticsearch-certutil cert --out kibana.p12 -days 18250 --ca ca.p12 --ca-pass castorepass --name kibana --dns localhost --pass storepass

# Copy the PKCS #12 keystore for Elasticsearch with an empty password
openssl pkcs12 -in elasticsearch.p12 -nodes -passin pass:"storepass" -passout pass:"" | openssl pkcs12 -export -out elasticsearch_emptypassword.p12 -passout pass:""

# Manually create "elasticsearch_nopassword.p12" -- this can be done on macOS by importing the P12 key store into the Keychain and exporting it again

# Extract the PEM-formatted X.509 certificate for the CA
openssl pkcs12 -in elasticsearch.p12 -out ca.crt -cacerts -passin pass:"storepass" -passout pass:

# Extract the PEM-formatted PKCS #1 private key for Elasticsearch
openssl pkcs12 -in elasticsearch.p12 -nocerts -passin pass:"storepass" -passout pass:"keypass" | openssl rsa -passin pass:keypass -out elasticsearch.key

# Extract the PEM-formatted X.509 certificate for Elasticsearch
openssl pkcs12 -in elasticsearch.p12 -out elasticsearch.crt -clcerts -passin pass:"storepass" -passout pass:

# Extract the PEM-formatted PKCS #1 private key for Kibana
openssl pkcs12 -in kibana.p12 -nocerts -passin pass:"storepass" -passout pass:"keypass" | openssl rsa -passin pass:keypass -out kibana.key

# Extract the PEM-formatted X.509 certificate for Kibana
openssl pkcs12 -in kibana.p12 -out kibana.crt -clcerts -passin pass:"storepass" -passout pass:
```
