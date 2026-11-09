#!/bin/sh

set -eu

openssl_version="$1"
openssl_sha256="$2"
output_dir="$3"

printf '%s  openssl.tar.gz\n' "$openssl_sha256" | sha256sum -c -
tar -xzf openssl.tar.gz
cd "openssl-$openssl_version"

export OPENSSL_CONF=/dev/null
unset OPENSSL_MODULES OPENSSL_CONF_INCLUDE

./Configure enable-fips
make -j"$(nproc)"
make test TESTS='test_fipsinstall test_fipsload'

mkdir -p "$output_dir/modules" "$output_dir/config"
cp providers/fips.so "$output_dir/modules/fips.so"
cp LICENSE.txt "$output_dir/LICENSE.txt"

# Generate integrity data without caching successful installation self-tests.
# Each deployed process must run the provider's self-tests when it loads it.
perl util/wrap.pl apps/openssl fipsinstall \
  -module "$output_dir/modules/fips.so" \
  -out "$output_dir/config/fipsmodule.cnf" \
  -pedantic -self_test_onload
perl util/wrap.pl apps/openssl fipsinstall \
  -module "$output_dir/modules/fips.so" \
  -in "$output_dir/config/fipsmodule.cnf" \
  -pedantic -verify

{
  perl util/wrap.pl apps/openssl version -a
  gcc --version
  perl configdata.pm --dump
} > "$output_dir/build_info.txt"
