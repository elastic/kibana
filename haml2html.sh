#!/bin/bash
for file in $(find src/ -name '*.haml' | sed s/.haml$// | sed s/src\//)
do
  echo $file
  haml --double-quote-attributes ./src/$file.haml ./$file &
done

