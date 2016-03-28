#!/bin/sh

# GYP's MAKEFLAGS confuses libusdt's Makefile
#
unset MAKEFLAGS

# Ask node what arch it's been built for, and build libusdt to match.
#
# We use node from the path; npm will have adjusted PATH for us if
# necessary, otherwise we assume the user did so when building by
# hand.
#
# (this will need to change at the point that GYP is able to build
# node extensions universal on the Mac - for now we'll go with x86_64
# on a 64 bit Mac, because that's the default architecture in that
# situation).
#
ARCH=`node libusdt-arch.js`
echo "Building libusdt for ${ARCH}"
export ARCH

# Respect a MAKE variable if set
if [ -z $MAKE ]; then
  # Default to `gmake` first if available, because we require GNU make
  # and `make` isn't GNU make on some plats.
  MAKE=`which gmake`
  if [ -z $MAKE ]; then
    MAKE=make
  fi
fi

# Build.
#
$MAKE -C libusdt clean all
