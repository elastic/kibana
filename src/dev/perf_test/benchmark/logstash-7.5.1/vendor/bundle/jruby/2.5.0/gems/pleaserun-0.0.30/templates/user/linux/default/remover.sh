#!/bin/sh

user_check() {
  getent passwd "$1" > /dev/null 2>&1
}

user_remove() {
  userdel "$1"
}

if user_check "{{{ name }}}" ; then
  user_remove "{{{ name }}}"
fi
