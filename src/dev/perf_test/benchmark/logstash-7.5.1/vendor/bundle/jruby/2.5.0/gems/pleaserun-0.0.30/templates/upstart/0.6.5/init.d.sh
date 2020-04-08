#!/bin/sh

echo "This job runs via upstart, invoking upstart now..."
exec initctl $1 {{name}}
