---
navigation_title: "JetBrains IDE setup"
description: "Recommended JetBrains IDE settings for Kibana development"
---

# Recommended JetBrains IDE settings for Kibana

The following settings help reduce unnecessary background analysis.

## Disable usage counts in Code Vision

Open **Settings → Editor → Inlay Hints → Code Vision** and disable:

- **Usages**
- **Component usages**

These hints automatically display usage counts in the editor. Computing them can add significant background work in a large repository. You can still invoke **Find Usages** whenever you need it.

## Disable the unused global symbol inspection

Open **Settings → Editor → Inspections → JavaScript and TypeScript → Unused symbols** and disable **Unused global symbol**.

Determining whether a globally accessible declaration is unused requires searching beyond the current file. Disabling this inspection reduces background analysis. Inspections for unused local symbols can remain enabled.

## Increase the IDE memory heap

Press **Shift** twice, search for **Memory Settings**, and open the dialog. If the maximum heap size is below **4096 MiB (4 GiB)**, increase it to that value as a starting point, then restart the IDE.

A larger heap gives the IDE more room for project data and can reduce slowdowns caused by frequent garbage collection. Adjust it further based on actual memory usage and available system RAM.

To monitor heap usage, right-click the status bar and enable **Memory Indicator**. See the [WebStorm performance guide](https://www.jetbrains.com/help/webstorm/how-to-improve-product-performance.html#ws_improve_performance_increase_memory_heap) for more details.

## Configure the TypeScript language service

Open **Settings → Languages & Frameworks → TypeScript**.

If you use the Node.js-based TypeScript language service (**TypeScript 6 or earlier**), you can increase the memory available to its Node.js process under **Language Service Memory → Set memory limit**. This limit is separate from the IDE memory heap configured above.

For Kibana, we recommend selecting **TypeScript 7 (Native)** in the **TypeScript** field on the same settings page for faster editor analysis. Kibana is already migrating to TypeScript 7: the [migration commit](https://github.com/elastic/kibana/commit/6eb83a3d5a73fba0a914da02912c96d6745941fa) switches its CI type checking to TypeScript 7 while retaining TypeScript 6 for tooling that depends on the JavaScript compiler API.

This selection changes the language service used for editor coding assistance. It does not change Kibana's runtime behavior, project dependencies, or the TypeScript version invoked by its build and CI scripts. Because it changes the analysis engine, editor diagnostics and suggestions may also differ. The Node.js memory setting above does not apply to the native service.
