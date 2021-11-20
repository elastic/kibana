# PKCS12 Test Fixtures

These PKCS12 files are used to test different scenarios. Each has an empty password.

Including `-noiter` uses a single encryption iteration, and `-nomaciter` uses a single MAC verification iteration.
This makes each P12 keystore much quicker to parse.

Commands to generate files:

```shell
# Generate a PKCS12 file with an EE cert and CA cert, but no EE key
cat elasticsearch.crt ca.crt | openssl pkcs12 -export -noiter -nomaciter -passout pass: -nokeys -out no_key.p12

# Generate a PKCS12 file with an EE key and EE cert, but no CA cert
cat elasticsearch.key elasticsearch.crt | openssl pkcs12 -export -noiter -nomaciter -passout pass: -out no_ca.p12

# Generate a PKCS12 file with an EE key, EE cert, and two CA certs
cat elasticsearch.key elasticsearch.crt ca.crt ca.crt | openssl pkcs12 -export -noiter -nomaciter -passout pass: -out two_cas.p12

# Generate a PKCS12 file with two EE keys and EE certs
cat elasticsearch.key elasticsearch.crt | openssl pkcs12 -export -noiter -nomaciter -passout pass: -out two_keys.p12
cat kibana.key kibana.crt | openssl pkcs12 -export -noiter -nomaciter -passout pass: -name 2 -out tmp.p12
keytool -importkeystore -srckeystore tmp.p12 -srcstorepass '' -destkeystore two_keys.p12 -deststorepass '' -deststoretype PKCS12
rm tmp.p12
```

No commonly available tools seem to be able to generate a PKCS12 file with a key and no certificate, so we use node-forge to do that:

```js
const utils = require('@kbn/dev-utils');
const forge = require('node-forge');
const fs = require('fs');

const pemCA = fs.readFileSync(utils.CA_CERT_PATH, 'utf8');
const pemKey = fs.readFileSync(utils.ES_KEY_PATH, 'utf8');
const privateKey = forge.pki.privateKeyFromPem(pemKey);

const p12Asn = forge.pkcs12.toPkcs12Asn1(privateKey, pemCA, null, {
  useMac: false,
  generateLocalKeyId: false,
});
const p12Der = forge.asn1.toDer(p12Asn).getBytes();
fs.writeFileSync('no_cert.p12', p12Der, { encoding: 'binary' });
```
