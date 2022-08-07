set -e

rm -fr .tmp
mkdir .tmp

echo "Cloning handlebars repo..."
git clone -q --depth 1 https://github.com/handlebars-lang/handlebars.js.git -b 4.x .tmp/handlebars

files=(packages/kbn-handlebars/src/upstream/index.*.test.ts)

for file in "${files[@]}"
do
  tmp=${file#*.} # remove anything before first period
  file=${tmp%.test.ts} # remove trailing .test.ts

  echo "Checking for changes to spec/$file.js..."

  set +e
  diff .tmp/handlebars/spec/$file.js packages/kbn-handlebars/src/upstream/index.$file.test.ts > .tmp/$file.patch
  error=$?
  set -e
  if [ $error -gt 1 ]
  then
    echo "Error executing diff!"
    exit $error
  fi

  diff -u .tmp/$file.patch packages/kbn-handlebars/.patches/$file.patch
done

echo "No changes found :)"

rm -fr .tmp