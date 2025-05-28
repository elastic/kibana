---
description: Accessibility statement for Kibana
applies_to:
  stack: all
  serverless: all
products:
  - id: kibana
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/accessibility.html
---

# {{kib}} accessibility statement

Elastic is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience, and strive toward ensuring our tools are usable by everyone.

## Measures to support accessibility
Elastic takes the following measures to ensure accessibility of Kibana:

* Maintains and incorporates an [accessible component library](https://elastic.github.io/eui/).
* Provides continual accessibility training for our staff.
* Employs a third-party audit.

## Conformance status
Kibana aims to meet [WCAG 2.1 level AA](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa&technologies=server%2Csmil%2Cflash%2Csl) compliance. Currently, we can only claim to partially conform, meaning we do not fully meet all of the success criteria. However, we do try to take a broader view of accessibility, and go above and beyond the legal and regulatory standards to provide a good experience for all of our users.

## Feedback
We welcome your feedback on the accessibility of Kibana. Let us know if you encounter accessibility barriers on Kibana by either emailing us at `accessibility@elastic.co` or opening [an issue on GitHub](https://github.com/elastic/kibana/issues/new?labels=Project%3AAccessibility&template=Accessibility.md&title=%28Accessibility%29).

## Technical specifications
Accessibility of Kibana relies on the following technologies to work with your web browser and any assistive technologies or plugins installed on your computer:

* HTML
* CSS
* JavaScript
* WAI-ARIA

## Limitations and alternatives
Despite our best efforts to ensure accessibility of Kibana, there are some limitations. [Open an issue on GitHub](https://github.com/elastic/kibana/issues/new?labels=Project%3AAccessibility&template=Accessibility.md&title=%28Accessibility%29) if you observe an issue not in this list.

Known limitations are in the following areas:

* **Charts**: We have a clear plan for the first steps of making charts accessible. We’ve opened this [Charts accessibility ticket on GitHub](https://github.com/elastic/elastic-charts/issues/300) for tracking our progress.
* **Maps**: Maps might pose difficulties to users with vision disabilities. We welcome your input on making our maps accessible. Go to the [Maps accessibility ticket on GitHub](https://github.com/elastic/kibana/issues/57271) to join the discussion and view our plans.
* **Tables**: Although generally accessible and marked-up as standard HTML tables with column headers, tables rarely make use of row headers and have poor captions. You will see incremental improvements as various applications adopt a new accessible component.
* **Color contrast**: Modern Kibana interfaces generally do not have color contrast issues. However, older code might fall below the recommended contrast levels. As we continue to update our code, this issue will phase out naturally.

To see individual tickets, view our [GitHub issues with label "`Project:Accessibility`"](https://github.com/elastic/kibana/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc+label%3AProject%3AAccessibility).

## Assessment approach
Elastic assesses the accessibility of Kibana with the following approaches:

* **Self-evaluation**: Our employees are familiar with accessibility standards and review new designs and implemented features to confirm that they are accessible.
* **External evaluation**: We engage external contractors to help us conduct an independent assessment and generate a formal VPAT. Email `accessibility@elastic.co` if you’d like a copy.
* **Automated evaluation**: We are starting to run [axe](https://www.deque.com/axe/) on every page. See our current progress in the [automated testing GitHub issue](https://github.com/elastic/kibana/issues/51456).

Manual testing largely focuses on screen reader support and is done on:

* VoiceOver on MacOS with Safari, Chrome and Edge
* NVDA on Windows with Chrome and Firefox