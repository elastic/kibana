# @kbn/type-summarizer

Consume the .d.ts files for a package, produced by `tsc`, and generate a single `.d.ts` file of the public types along with a source map that points back to the original source.

## You mean like API Extractor?

Yeah, except with source map support and without all the legacy features and other features we disable to generate our current type summaries.

I first attempted to implement this in api-extractor but I (@spalger) hit a wall when dealing with the `Span` class. This class handles all the text output which ends up becoming source code, and I wasn't able to find a way to associate specific spans with source locations without getting 12 headaches. Instead I decided to try implementing this from scratch, reducing our reliance on the api-extractor project and putting us in control of how we generate type summaries.

This package is missing some critical features for wider adoption, but rather than build the entire product in a branch I decided to implement support for a small number of TS features and put this to use in the `@kbn/crypto` module ASAP.

The plan is to expand to other packages in the Kibana repo, adding support for language features as we go.

## Something isn't working and I'm blocked!

If there's a problem with the implmentation blocking another team at any point we can move the package back to using api-extractor by removing the package from the `TYPE_SUMMARIZER_PACKAGES` list at the top of [packages/kbn-type-summarizer/src/lib/bazel_cli_config.ts](./src/lib/bazel_cli_config.ts).