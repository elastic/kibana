import registry from 'ui/string_resources/registry';

registry.register({

  addData: {

    pipelineSetup: {

      headerTextCallout:
        `Let's build a pipeline!`,

      headerText:
        `Ingest pipelines are an easy way to modify documents before they're indexed in Elasticsearch.
They're composed of processors which can change your data in many ways. Create a pipeline
below while cycling through your samples to see its effect on your data.`,

      pipelineLabel:
        `Processor Pipeline`,

      pipelineTooltip:
        `A pipeline is a definition of a series of processors that are to be executed in the same order
as they are declared.`,

      nextSample:
        `Next Sample`,

      previousSample:
        `Previous Sample`,

      collapseLeftPanel:
        `Collapse Left Panel`,

      expandLeftPanel:
        `Expand Left Panel`,

      collapseRightPanel:
        `Collapse Right Panel`,

      expandRightPanel:
        `Expand Right Panel`,

      processorTypePlaceholder:
        `Select a Processor...`,

      emptyPipeline:
        `Your pipeline is currently empty. Add a processor to get started!`

    },

    pipelineOutput: {

      label:
        `Pipeline Output`,

      tooltip:
        `The pipeline output shows the result of the defined pipeline using the sample records
supplied in the previous step.`,

    }

  }

});
