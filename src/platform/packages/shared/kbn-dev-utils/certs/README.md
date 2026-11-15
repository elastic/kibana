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
* `kibana_serverless_<projectType>.crt` -- A PEM-formatted X.509 certificate and public key Kibana presents to UIAM on a local Serverless project of that type (`search`, `observability`, `security`, `vectordb`).
* `kibana_serverless_<projectType>.key` -- A PEM-formatted PKCS #8 private key for that certificate.
* `relay.crt` -- A PEM-formatted X.509 certificate and public key for the Relay service.
* `relay.key` -- A PEM-formatted PKCS #1 private key for the Relay service.

### PKCS #12

* `elasticsearch.p12` -- A [PKCS #12](https://tools.ietf.org/html/rfc7292) encrypted key store / trust store that contains `ca.crt`, `elasticsearch.crt`, and a [PKCS #8](https://tools.ietf.org/html/rfc5208) encrypted version of `elasticsearch.key`.
* `kibana.p12` -- A PKCS #12 encrypted key store / trust store that contains `ca.crt`, `kibana.crt`, and a PKCS #8 encrypted version of `kibana.key`.
* `relay.p12` -- A PKCS #12 encrypted key store / trust store that contains `ca.crt`, `relay.crt`, and a PKCS #8 encrypted version of `relay.key`.

The password used for both of these is "storepass". Other copies are also provided for testing purposes:

* `elasticsearch_emptypassword.p12` -- The same PKCS #12 key store, encrypted with an empty password.
* `elasticsearch_nopassword.p12` -- The same PKCS #12 key store, not encrypted with a password.

## Kibana's Serverless UIAM identity

UIAM reads Kibana's organization, project and **project type** from the client certificate Kibana
presents, in a SAN of the form
`EIDENT.<projectId>.project.<uiamProjectType>.type.<organizationId>.organization`.

When the certificate names another project type than the one Kibana acts for, UIAM refuses it:
listing service accounts comes back empty, reading one answers 403, and assuming one is denied with
"Subject is not in organization service account assumable-by list". So there is one certificate per
Serverless project type, and `src/cli/serve/serve.js` picks the one matching
`xpack.cloud.serverless.project_type` (`getKbnServerlessUiamCert` in `src/certs.ts`):

| `project_type` | Certificate | UIAM project type in the SAN |
|---|---|---|
| `search` | `kibana_serverless_search.crt` | `elasticsearch` |
| `observability` | `kibana_serverless_observability.crt` | `observability` |
| `security` | `kibana_serverless_security.crt` | `security` |
| `vectordb` | `kibana_serverless_vectordb.crt` | `vectordb` |

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

### Relay service

The Relay certificate is generated with OpenSSL rather than `elasticsearch-certutil`, because it needs a URI
Subject Alternative Name (`spiffe://relay-service.elastic.co`) and both the `clientAuth` and `serverAuth` extended
key usages. `certutil` emits neither. It is signed by the same `ca.p12` as every other certificate here, so
`ca.crt` remains the only trust anchor a dev environment needs.

First extract the CA certificate and key from `ca.p12`:

```
openssl pkcs12 -in ca.p12 -passin pass:"castorepass" -nokeys -clcerts -out ca_signing.crt
openssl pkcs12 -in ca.p12 -passin pass:"castorepass" -nocerts -nodes -out ca_signing.key
```

Then write `relay.cnf`:

```
[req]
default_bits       = 2048
default_md         = sha256
prompt             = no
distinguished_name = dn
req_extensions     = v3_req

[dn]
CN = relay-service
O  = Elastic

[v3_req]
basicConstraints = CA:FALSE
keyUsage         = critical, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
subjectAltName   = @alt_names

[alt_names]
URI.1 = spiffe://relay-service.elastic.co
DNS.1 = localhost

[v3_ext]
basicConstraints       = CA:FALSE
keyUsage               = critical, digitalSignature, keyEncipherment
extendedKeyUsage       = clientAuth, serverAuth
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always
subjectAltName         = @alt_names
```

And generate, again valid for 50 years:

```
# Generate the key and a certificate signing request
openssl genrsa -out relay_signing.key 2048
openssl req -new -key relay_signing.key -out relay.csr -config relay.cnf

# Sign it with the CA
openssl x509 -req -in relay.csr -CA ca_signing.crt -CAkey ca_signing.key -CAcreateserial -out relay_signed.crt -days 18250 -sha256 -extfile relay.cnf -extensions v3_ext

# Build the PKCS #12 keystore, including the CA so the chain is complete
openssl pkcs12 -export -out relay.p12 -inkey relay_signing.key -in relay_signed.crt -certfile ca_signing.crt -name relay-service -caname ca -passout pass:"storepass" -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256 -iter 10000

# Mark the CA as a trusted certificate entry, matching the other key stores
keytool -importcert -keystore relay.p12 -storetype PKCS12 -storepass storepass -alias ca -file ca_signing.crt -noprompt

# Extract the PEM-formatted PKCS #1 private key for the Relay service
openssl pkcs12 -in relay.p12 -nocerts -passin pass:"storepass" -passout pass:"keypass" | openssl rsa -passin pass:keypass -out relay.key -traditional

# Extract the PEM-formatted X.509 certificate for the Relay service
openssl pkcs12 -in relay.p12 -out relay.crt -clcerts -passin pass:"storepass" -passout pass:
```

### Kibana's Serverless UIAM certificates

`kibana_serverless_<projectType>.crt` is issued from the same CA, with Kibana's SANs and the UIAM
project type in the `EIDENT` SAN. Extract the CA from `ca.p12` (generated above) to `ca.crt` and
`ca.key`, then run, for example for a security project:

```
PROJECT_TYPE=security        # the file name: search, observability, security or vectordb
UIAM_PROJECT_TYPE=security   # the SAN: elasticsearch for search, otherwise the same

# The SANs of kibana.crt, with the project's UIAM project type
cat > kibana_serverless_$PROJECT_TYPE.cnf <<XEOF
basicConstraints=CA:FALSE
subjectAltName=DNS:es01,DNS:es02,DNS:es03,DNS:localhost,DNS:host.docker.internal,DNS:kb-kb-uiam.project-abcdef12345678901234567890123456.kb.local,DNS:EIDENT.abcdef12345678901234567890123456.project.$UIAM_PROJECT_TYPE.type.org1234567890.organization
XEOF

# Generate the key and a certificate signing request
openssl req -newkey rsa:2048 -nodes -keyout kibana_serverless_$PROJECT_TYPE.key -subj "/CN=kibana" -out kibana_serverless_$PROJECT_TYPE.csr

# Sign it with the CA, valid for 50 years
openssl x509 -req -in kibana_serverless_$PROJECT_TYPE.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out kibana_serverless_$PROJECT_TYPE.crt -days 18250 -sha256 -extfile kibana_serverless_$PROJECT_TYPE.cnf
```

The project and organization ids are the local Serverless ones from `@kbn/mock-idp-utils`, the same
as in `kibana.crt`.
