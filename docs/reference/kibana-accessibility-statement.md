---
description: Accessibility statement for Elastic products
applies_to:
  stack: all
  serverless: all
products:
  - id: kibana
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/accessibility.html
navigation_title: Accessibility
---

# {{kib}} Accessibility Statement (USA, Europe, and Beyond)

Elastic is committed to ensuring that our product suite is accessible to all users, including people with disabilities. This statement outlines our ongoing efforts to meet or exceed accessibility compliance requirements in the United States, the European Union, and globally. We view accessibility as a core part of user experience and software quality.

## Legal Compliance and Standards
Elastic aligns with the Web Content Accessibility Guidelines (WCAG) 2.2, the most current version of globally recognized accessibility standards.
* United States
  - Federal agencies follow Section 508, which requires WCAG 2.0 Level AA compliance.
  - The 2024 ADA amendment raises the bar to WCAG 2.1 Level AA.
* European Union
  - The European Accessibility Act (EAA) took effect on June 28, 2025, mandating that consumer-facing digital products and services meet accessibility outcomes defined in Annex I, typically interpreted as WCAG 2.1/2.2    Level AA.
  - Member States may enforce stricter local accessibility laws and penalties for non-compliance.

Elastic is proactively auditing its products and publishing Voluntary Product Accessibility Templates (VPATs) to ensure alignment with both U.S. and EU requirements.

## Measures to support accessibility
Elastic takes the following measures to ensure accessibility across Kibana:
- Maintains and incorporates an accessible component library.
- Provides continual accessibility training to staff.
- Conducts continuous accessibility audits and ensures that any found issues get fixed in a reasonable timeframe.
We value and prioritize accessibility feedback from our users and customers. Their input plays a critical role in shaping our accessibility roadmap and helps us address real-world barriers more effectively.

## Conformance status
Elastic and its suite of products aim to meet [WCAG 2.2 Level AA compliance](https://www.w3.org/WAI/WCAG22/quickref/?versions=2.1). Currently, we partially conform, meaning some success criteria have not yet been fully met. However, Elastic goes beyond regulatory minimums to deliver inclusive design and user experiences.

## Feedback
We welcome your feedback on the accessibility of Kibana. Let us know if you encounter accessibility barriers on Kibana by either emailing us at `accessibility@elastic.co` or opening [an issue on GitHub](https://github.com/elastic/kibana/issues/new?labels=Project%3AAccessibility&template=Accessibility.md&title=%28Accessibility%29).

## Technical specifications

Accessibility of Kibana relies on the following technologies to work with your web browser and any assistive technologies or plugins installed on your computer:

* HTML
* CSS
* JavaScript
* WAI-ARIA

## Testing Tools and Approach

We use a combination of manual and automated testing methods across the development lifecycle, including:
- NVDA (screen reader)
- VoiceOver (macOS/iOS)
- Manual keyboard navigation testing
- High contrast mode (native OS)
- Axe-core browser plugin
- Chrome accessibility tree inspection
- WAVE evaluation tool
- Browser-based zoom and reflow testing

Accessibility testing is integrated into:
- Design reviews
- Pre-release accessibility quality assurance checks
- Quarterly post-release audits

## Accessibility Conformance Reports (VPATs)

VPATs and Accessibility Conformance Reports (ACRs) are available for:
- Platform
- Observability Solution
- Security Solution
- Search Solution

To request a report, please email: accessibility@elastic.co

## Limitations and alternatives

Despite our best efforts, some accessibility limitations remain. We are actively tracking and addressing the following areas:
- Charts – Accessible charting is in [progress](https://github.com/elastic/elastic-charts/issues/300).
- Maps – May present challenges for [assistive technologies](https://github.com/elastic/kibana/issues/57271).
- Tables – Most tables use standard HTML, but row headers and captions are inconsistently implemented. Improvements are underway via new accessible components.

To view and track accessibility issues, visit our [GitHub Project: Accessibility issues](https://github.com/elastic/kibana/issues?q=label%3AProject%3AAccessibility).

## Progress and Continuous Improvement
Between 2024 and 2025, Elastic identified over [2,500 accessibility issues across its products](https://github.com/elastic/kibana/issues?q=label%3AProject%3AAccessibility). More than 1,800 issues have been triaged and resolved, thanks to close collaboration between accessibility engineers and product development teams. As part of our phased approach to accessibility compliance, we are currently auditing and remediating all outstanding WCAG 2.2 Level A issues. Once this baseline level is achieved, we will begin the audit and remediation process for WCAG 2.2 Level AA conformance. 

Accessibility is part of our product lifecycle, from early design through post-release, and our teams are constantly learning and adapting to evolving standards.

## Feedback

We welcome your feedback on the accessibility of our products. If you encounter any accessibility barriers, please contact us at: accessibility@elastic.co

