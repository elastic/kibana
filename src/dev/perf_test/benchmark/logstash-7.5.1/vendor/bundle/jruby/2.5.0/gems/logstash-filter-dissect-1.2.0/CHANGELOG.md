## 1.2.0
  - Fix Trailing Delimiters requires a false field. A skip field is
  automatically added when a final delimiter is detected in the dissect pattern.
  This requires that strict delimiter finding is enforced  - meaning a "no match"
  results if every delimiter is not found in exactly the declared order
  [Issue #22](https://github.com/logstash-plugins/logstash-filter-dissect/issues/22)

## 1.1.4
  - Replace v1.1.3 as it packaged the v1.1.1 jar and therefore does not have the fixes below
  - Yank v1.1.3 from rubygems.org

## 1.1.3
  - Test for "Improve field regular expression accuracy to include prefix and suffix options", fixed in 1.1.1
  - Fix for "Dissector mapping, field found in event but it was empty" caused by multibyte UTF8, bytes size vs string size
  - Fix for "Bug: if a dissection is defined with a newline as part of a delimiter it is ignored."

## 1.1.2
  - Update gemspec summary

## 1.1.1
  - Fix for "Missing field values cause dissected fields to be out of position" issue. See updated documentation.
  - Fix for "Check empty fields" issue, empty fields handled better.
  - Fix for "Integer conversion does not handle big integers".
  
## 1.0.12
  - Fix some documentation issues

## 1.0.11
 - Fix gemspec to include vendor/jars

## 1.0.10
 - Fix gradle now that Event has been moved into Logstash Core
 - Exit on gradle failures to help protect against bad releases 

## 1.0.9
 - Docs: Fix doc generation error by removing illegal heading
 - Add metrics to track the number of matches and failures

## 1.0.8
 - Add "vendor/jars" to require_paths in gemspec

## 1.0.7
 - Update the version and rebuild the vendored jar.

## 1.0.6
 - Skipping this version number, it exists on Rubygems but is faulty

## 1.0.5
 - Initial commit
