#!/bin/bash

COSMOS_DB_CA_PATH=/tmp/uiam_cosmosdb.pfx
COSMOS_DB_CA_PASSWORD="secret"
COMBINED_CA_BUNDLE_PATH=/opt/jboss/container/java/combined-cacerts

echo "*** Importing CosmosDB emulator CA certificate into JVM cacerts ***"
cp "$JAVA_HOME/lib/security/cacerts" $COMBINED_CA_BUNDLE_PATH
chmod 777 $COMBINED_CA_BUNDLE_PATH

keytool -importkeystore \
        -srckeystore $COSMOS_DB_CA_PATH \
        -srcstoretype PKCS12 \
        -srcstorepass $COSMOS_DB_CA_PASSWORD \
        -keystore $COMBINED_CA_BUNDLE_PATH \
        -storepass changeit -noprompt

export JAVA_TOOL_OPTIONS="\
  -Djavax.net.ssl.trustStore=$COMBINED_CA_BUNDLE_PATH \
  -Djavax.net.ssl.trustStorePassword=changeit \
  -Djavax.net.ssl.trustStoreType=JKS \
  -Djavax.net.debug=ssl"

exec /opt/jboss/container/java/run/run-java.sh
