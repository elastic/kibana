#!/bin/sh

set -eu

if [ "$1" = tar ]; then
  # Test extraction into a location that differs from the archive's root name.
  DIR='/opt/relocated kibana'
  mkdir -p "$DIR"
  tar -xzf /tmp/kibana.tar.gz -C "$DIR" --strip-components=1
else
  dnf install -y /tmp/kibana.rpm
  test "$(rpm -q --queryformat '%{NAME}' kibana-fips)" = kibana-fips
  DIR=/usr/share/kibana
fi

# Custom configuration must retain the package defaults, including in CLI tools.
export KBN_PATH_CONF=/tmp/custom_config
mkdir -p "$KBN_PATH_CONF"
printf '{}\n' > "$KBN_PATH_CONF/kibana.yml"
. "$DIR/bin/kibana_env"

"$DIR/node/default/bin/node" -e '
  const assert = require("node:assert/strict");
  const crypto = require("node:crypto");
  assert.equal(crypto.getFips(), 1);
  assert.equal(crypto.randomBytes(32).length, 32);
  assert.equal(crypto.createHash("sha256").update("test").digest("hex"),
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
  assert.throws(() => crypto.createHash("md5"), { code: "ERR_OSSL_EVP_UNSUPPORTED" });
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update("FIPS test"), cipher.final()]);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(cipher.getAuthTag());
  assert.equal(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(), "FIPS test");
'

"$DIR/bin/kibana" --version
"$DIR/bin/kibana-keystore" create
"$DIR/bin/kibana-keystore" list
"$DIR/bin/kibana-encryption-keys" generate
"$DIR/bin/kibana-plugin" list

# An unavailable provider must fail startup rather than run without FIPS.
mv "$DIR/node/fips/modules/fips.so" "$DIR/node/fips/modules/fips.so.disabled"
if "$DIR/node/default/bin/node" -e 'require("node:crypto").randomBytes(32)'; then
  echo 'Node unexpectedly started without its FIPS provider' >&2
  exit 1
fi

mv "$DIR/node/fips/modules/fips.so.disabled" "$DIR/node/fips/modules/fips.so"
printf corrupt >> "$DIR/node/fips/modules/fips.so"
if "$DIR/node/default/bin/node" -e 'require("node:crypto").randomBytes(32)'; then
  echo 'Node unexpectedly started with a corrupted FIPS provider' >&2
  exit 1
fi
