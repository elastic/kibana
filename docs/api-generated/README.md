# OpenAPI (Experimental)

Open API specifications (OAS) exist in JSON or YAML format for some Kibana features,
though they are experimental and may be incomplete or change later.

A preview of the API specifications can be added to the Kibana Guide by using
the following process:

. Install [OpenAPI Generator](https://openapi-generator.tech/docs/installation),
or a similar tool that can generate HTML output from OAS.

. Optionally validate the specifications by using the commands listed in the appropriate readmes.

. Generate HTML output. For example:

  ```
  openapi-generator-cli generate -g html -i ~/kibana/x-pack/plugins/cases/docs/openapi/bundled.yaml -o ~/kibana/docs/api-generated/cases -t ~/kibana/docs/api-generated/template

  openapi-generator-cli generate -g html -i ~/kibana/x-pack/plugins/ml/common/openapi/ml_apis_v3.yaml -o ~/kibana/docs/api-generated/machine-learning -t ~/kibana/docs/api-generated/template
  ```

. Rename the output files. For example:
  ```
  mv ~/kibana/docs/api-generated/cases/index.html case-apis-passthru.asciidoc
  mv ~/kibana/docs/api-generated/machine-learning/index.html ml-apis-passthru.adoc
  ```

. If you're creating a new set of API output, you will need to have a page that incorporates the output by using passthrough blocks. For more information, refer to [Asciidoctor docs](https://docs.asciidoctor.org/asciidoc/latest/pass/pass-block/)

. Verify the output by building the Kibana documentation. At this time, the output is added as a technical preview in the appendix.

## Known issues

- Some OAS 3.0 features such as `anyOf`, `oneOf`, and `allOf` might not display properly in the preview. These are on the [Short-term roadmap](https://openapi-generator.tech/docs/roadmap/) at this time.


