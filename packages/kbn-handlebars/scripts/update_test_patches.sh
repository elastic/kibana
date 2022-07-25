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

  echo "Overwriting stored patch file for spec/$file.js..."
  set +e
  diff .tmp/handlebars/spec/$file.js packages/kbn-handlebars/src/upstream/index.$file.test.ts > packages/kbn-handlebars/.patches/$file.patch
  set -e
done

echo "All patches updated :)"

rm -fr .tmp