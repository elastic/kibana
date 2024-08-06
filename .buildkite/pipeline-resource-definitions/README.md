# Buildkite pipeline resource definitions

## Overview
The pipeline resources are "RRE" (real resource entities) that are used to create/maintain buildkite pipelines.

The resources described in these files are parsed and loaded to Backstage (https://backstage.elastic.dev).
From there, [Terrazzo](https://buildkite.com/elastic/terrazzo/) is generating and updating the buildkite pipelines.

These pipelines are referenced indirectly through the root's [`catalog-info.yaml`](../../catalog-info.yaml) file in order to reduce bloat in the main resources file.
There's a location file that collects files defined in this folder ([locations.yml](locations.yml)), this file needs to be updated in order to keep track of local files.

Available parameters and further help can be found here: https://docs.elastic.dev/ci/getting-started-with-buildkite-at-elastic

## Creating a new pipeline resource definition
The easiest way to create a new pipeline is either by copying and editing a similar pipeline, 
or by copying a blank template (see [_new_pipeline.yml](_templates/_new_pipeline.yml)) and editing that.

You can validate your pipeline's structural integrity, and it's conformity to baseline rules by running the following command:
```bash
.buildkite/pipeline-resource-definitions/scripts/validate-pipeline-definition.sh <path_to_your_pipeline_file>
```

Once you've added the file, you should update the [locations.yml](locations.yml) file to include the new pipeline, or run the following command to update it:
```bash
.buildkite/pipeline-resource-definitions/scripts/fix-location-collection.ts
```

Add your pipeline implementation, commit & push & merge. The pipeline resource will appear in Backstage within minutes, then the pipeline will be added to Buildkite within ~10 minutes.