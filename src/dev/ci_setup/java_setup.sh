#!/bin/bash
set -e

# Sets the JAVA_HOME based on the Java property file in the ES repo
# This assumes the naming convention used on CI (ex: ~/.java/java10)

ES_DIR="$(cd "$(dirname "$BASH_SOURCE")/../../../../elasticsearch"; pwd)"
ES_JAVA_PROP_PATH=$ES_DIR/.ci/java-versions.properties

# While sourcing the property file would currently work, we want
# to support the case where whitespace surrounds the equals.
# This has the added benefit of explicitly exporting property values

function exportPropertyValue {
  propertyFile=$1
  propertyKey=$2

  propertyValue=$(cat $propertyFile | grep "^$propertyKey" | cut -d'=' -f2 | tr -d '[:space:]')
  export $propertyKey=$propertyValue
}

if [ ! -f $ES_JAVA_PROP_PATH ]; then
  echo "Unable to set JAVA_HOME, $ES_JAVA_PROP_PATH does not exist"
  exit 1
fi

exportPropertyValue $ES_JAVA_PROP_PATH "ES_BUILD_JAVA"

if [ -z "$ES_BUILD_JAVA" ]; then
  echo "Unable to set JAVA_HOME, ES_BUILD_JAVA not present in $ES_JAVA_PROP_PATH"
  exit 1
fi

echo "Setting JAVA_HOME=$HOME/.java/$ES_BUILD_JAVA"
export JAVA_HOME=$HOME/.java/$ES_BUILD_JAVA