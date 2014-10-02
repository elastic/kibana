**Kibana 3 Migration FAQ:**

**Q:** Where is feature X that I loved from Kibana 3?  
**A:** It might be coming! We’ve published our immediate roadmap as tickets. Check out the beta milestones on GitHub to see if the feature you’re missing is coming soon.

**Q:** Is the dashboard schema compatible?  
**A:** Unfortunately, they are not compatible. In order to create the new features we wanted, it simply was not possible to keep the same schema. Aggregations work fundamentally different from facets, the new dashboard isn’t tied to rows and columns and the relationships between searches, visualizations and the dashboard are complex enough that we simply had to design something more flexible.

**Q:** How do I do multi-query?  
**A:** The ‘filters’ aggregations will allow you to input multiple queries and compare them visually. You can even use Elasticsearch JSON in there!

**Q:** What happened to templated/scripted dashboards?  
**A:** Check out the URL. The state of each app is stored there, including any filters, queries or columns. This should be a lot easier than constructing scripted dashboards. The encoding of the URL is RISON.
