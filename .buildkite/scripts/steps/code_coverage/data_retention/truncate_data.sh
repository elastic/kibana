bucket="gs://elastic-bekitzur-kibana-coverage-live"

truncate() {
  while read line; do
    echo "### Truncating "$bucket/$line""
    gsutil -m rm -r "$bucket/$line" &
  done < .buildkite/scripts/steps/code_coverage/data_retention/dirs_file.txt
}

test_loop() {
  while read line; do
    echo "### Truncating ${bucket}/${line} ...not actually truncating"
  done < .buildkite/scripts/steps/code_coverage/data_retention/mock_dirs_file.txt
}

# Entrypoint commented out for now.
#truncate
