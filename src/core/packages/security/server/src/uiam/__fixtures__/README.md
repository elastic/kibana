# UIAM assertion signer test fixtures

Certificates and private keys used only by `../assertion_signer.test.ts`.

_Note: these are test fixtures and must **never** be used outside of tests._

All certificates are valid until November 14, 2036. Tests that sign assertions pin the clock, so they don't depend on the current date.

## Files

| Files | Key | Subject alternative names | Used to test |
|---|---|---|---|
| `rsa_eident.crt` / `.key` | RSA 2048 (PKCS #8) | `DNS:localhost`, `DNS:EIDENT.abcdef12345678901234567890123456.project.elasticsearch.type.org1234567890.organization` | RS256 signing, the uppercase `EIDENT.` subject, and the `x5c` chain. The `.crt` file holds the leaf followed by the self-signed `CN=UIAM assertion test CA` that issued it. |
| `ec_spiffe.crt` / `.key` | EC P-256 (PKCS #8) | `DNS:eident.…organization`, `URI:spiffe://kibana.elastic.co` | ES256 signing, and the SPIFFE URI taking precedence over the eident DNS name. Self-signed. |
| `rsa_no_identity.crt` / `.key` | RSA 2048 (PKCS #8) | `DNS:localhost` | Rejecting a certificate without a SPIFFE or eident identity. Its key also serves as a key that doesn't match `rsa_eident.crt`. Self-signed. |
| `ec_p384.crt` / `.key` | EC P-384 (PKCS #8) | `URI:spiffe://kibana.elastic.co` | Rejecting a curve other than P-256. Self-signed. |

## Regenerating

The fixtures were generated with OpenSSL 3+. The CA private key is not kept.

```sh
EIDENT=EIDENT.abcdef12345678901234567890123456.project.elasticsearch.type.org1234567890.organization

# rsa_eident: leaf signed by a throwaway CA, chain written leaf first.
openssl req -x509 -newkey rsa:2048 -noenc -keyout ca.key -out ca.crt -days 3650 \
  -subj "/CN=UIAM assertion test CA" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
openssl req -newkey rsa:2048 -noenc -keyout rsa_eident.key -out rsa.csr -subj "/CN=kibana"
printf "subjectAltName=DNS:localhost,DNS:%s\n" "$EIDENT" > rsa.ext
openssl x509 -req -in rsa.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out rsa_leaf.crt \
  -days 3650 -extfile rsa.ext
cat rsa_leaf.crt ca.crt > rsa_eident.crt

# ec_spiffe
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -noenc \
  -keyout ec_spiffe.key -out ec_spiffe.crt -days 3650 -subj "/CN=kibana" \
  -addext "subjectAltName=DNS:eident.abcdef12345678901234567890123456.project.elasticsearch.type.org1234567890.organization,URI:spiffe://kibana.elastic.co"

# rsa_no_identity
openssl req -x509 -newkey rsa:2048 -noenc -keyout rsa_no_identity.key -out rsa_no_identity.crt \
  -days 3650 -subj "/CN=kibana" -addext "subjectAltName=DNS:localhost"

# ec_p384
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:secp384r1 -noenc \
  -keyout ec_p384.key -out ec_p384.crt -days 3650 -subj "/CN=kibana" \
  -addext "subjectAltName=URI:spiffe://kibana.elastic.co"

rm ca.key ca.crt ca.srl rsa.csr rsa.ext rsa_leaf.crt
```
