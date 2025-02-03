# @kbn/performance-testing-dataset-extractor

A library to convert APM traces into JSON format for performance testing.

## Usage

```
    node scripts/extract_performance_testing_dataset \
        --journeyName "<_source.labels.journeyName>" \
        --buildId "<_source.labels.testBuildId>" \
        --es-url "<ES baseURL>" \
        --es-username "<ES username>" \
        --es-password "<ES password>"
```