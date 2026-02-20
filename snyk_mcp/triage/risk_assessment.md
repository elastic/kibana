Comment for issue https://api.github.com/repos/elastic/security/issues/0:

    - **Triage:** High severity vulnerability (CVE-2025-11362) in pdfmake@0.2.15 used by Kibana's screenshotting plugin for PDF report generation. The vulnerability allows attackers to cause application crashes through repeated redirect URLs in file embedding. Since Kibana processes user-controlled content when generating PDF reports from dashboards and visualizations, this poses a significant risk. The vulnerability affects production functionality used for exporting dashboards and reports.
    - **Risk response:** mitigate
    - **Upgrade paths:**
        - pdfmake@0.2.15 -> pdfmake@0.3.0-beta.17
    

Comment for issue https://api.github.com/repos/elastic/security/issues/0:
### Security statement
```yaml

      cve: CVE-2025-11362
      status: future update
      statement: Kibana is affected by this issue. pdfmake@0.2.15 is used in the screenshotting plugin for PDF report generation functionality. The vulnerability allows attackers to cause application crashes through repeated redirect URLs in file embedding, which can be triggered when processing user-controlled content during PDF export operations from dashboards and visualizations. pdfmake will be updated to version 0.3.0-beta.17 or higher as part of Kibana standard maintenance practices in a future Kibana version.
      product: kibana
      dependency: pdfmake
    
```

