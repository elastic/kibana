ARG BUILD_IMAGE
FROM ${BUILD_IMAGE} AS builder

# Freeze the toolchain repositories as well as the base image. Package signatures
# are still verified; snapshot Release files have intentionally expired dates.
RUN printf '%s\n' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20260824T000000Z bullseye main' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/20260824T000000Z bullseye-security main' \
      > /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gcc libc6-dev make perl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY openssl.tar.gz build_provider.sh ./
ARG OPENSSL_VERSION
ARG OPENSSL_SHA256
RUN sh ./build_provider.sh "$OPENSSL_VERSION" "$OPENSSL_SHA256" /output

FROM scratch
COPY --from=builder /output/ /
