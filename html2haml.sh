#!/bin/bash
for file in $(find . -name '*.html')
do
  mkdir -p src/$(dirname $file)
  html2haml --unix-newlines $file src/$file.haml &
done
