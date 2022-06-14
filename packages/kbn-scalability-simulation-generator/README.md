# @kbn/scalability-simulation-generator

A library to generate scalability benchmarking simulation file, that can be run by Gatling performance testing tool.

## Usage

There are 2 ways to run auto-generated simulation files, using:
  - Gatling bundle
  - kibana-load-testing project

If you plan to use Gatling-bundle, generate simulation using this command:

```
    node scripts/generate_scalability_simulations.js \
      --dir "<path to @kbn/performance-testing-dataset-extractor output>" \
      --baseUrl "<Kibana server baseURL>"
```

If you plan to use [kibana-load-testing](https://github.com/elastic/kibana-load-testing), use the following command:

```
    node scripts/generate_scalability_simulations.js \
      --dir "<path to @kbn/performance-testing-dataset-extractor output>" \
      --baseUrl "<Kibana server baseURL>" \
      --packageName "org.kibanaLoadTest"
```

To run the generated simulation:
- Move file to `src/test/scala/org/kibanaLoadTest`
- Compile source code `mvn clean compile`
- Run simulation `mvn gatling:test -Dgatling.simulationClass=org.kibanaLoadTest.<simulationFileName>`
