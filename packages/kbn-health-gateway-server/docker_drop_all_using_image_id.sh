#!/bin/bash

dropAll() {
  image="$1"
  echo "  ### Dropping all the containers built from this image id: ${1}"
  docker ps -a | awk '{ print $1,$2 }' | grep "$1" | awk '{print $1}' | xargs -I {} docker rm {}
}
dropAll "$1"
