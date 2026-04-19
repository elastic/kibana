---
description: Examples of plugin performance optimization.
---

# Performance Case Studies

These are case studies of performance optimization in Kibana plugins, based on real-world examples.


<DocRelatedArticles
  items={[
    {
      pageId: "kibDevPerformanceCaseStudyTopLevelImports",
      title: "Top level imports",
      description: "Don't export all the things, you'll import all the things.",
      footer: true
    },
    {
      pageId: "kibDevPerformanceCaseStudyAsyncTooEarly",
      title: "Async too early",
      description: "Create async chunks in the right place.",
      footer: true
    },
    {
      pageId: "kibDevPerformanceCaseStudyUncommonCodeInCommon",
      title: "Uncommon code in common",
      description: "Keep common code common.",
      footer: true
    },
  ]}
/>

:::{warning}
The purpose of these case studies is to provide examples of performance optimization, but not to call out individual teams or plugins.  Every plugin author should study these and other examples to ensure their plugins are also optimized.
:::
