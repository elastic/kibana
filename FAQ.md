# Frequently asked questions

**Q:** I'm getting `bin/node/bin/node: not found` but I can see the node binary in the package?
**A:** Kibana 4 packages are architecture specific. Ensure you are using the correct package for your architecture.

**Q:** Where do I go for support?
**A:** Please join us at [discuss.elastic.co](https://discuss.elastic.co) with questions. Your problem might be a bug, but it might just be a misunderstanding, or a feature we could improve. We're also available on Freenode in #kibana

**Q:** Ok, we talked about it and its definitely a bug
**A:** Doh, ok, let's get that fixed. File an issue on [github.com/elastic/kibana](https://github.com/elastic/kibana). I'd recommend reading the beginning of the CONTRIBUTING.md, just so you know how we'll handle the issue.

### Kibana 3 Migration
**Q:** Where is feature X that I loved from Kibana 3?
**A:** It might be coming! We’ve published our immediate roadmap as tickets. Check out the beta milestones on GitHub to see if the feature you’re missing is coming soon.

**Q:** Is the dashboard schema compatible?
**A:** Unfortunately, it is not compatible. In order to create the new features we wanted, it simply was not possible to keep the same schema. Aggregations work fundamentally different from facets, the new dashboard isn’t tied to rows and columns, and the relationships between searches, visualizations and the dashboard are complex enough that we simply had to design something more flexible.

**Q:** How do I execute a multi-query?
**A:** The ‘filters’ aggregations will allow you to input multiple queries and compare them visually. You can even use Elasticsearch JSON in there!

**Q:** What happened to templated/scripted dashboards?
**A:** Check out the URL. The state of each app is stored there, including any filters, queries or columns. This should be a lot easier than constructing scripted dashboards. The encoding of the URL is RISON.
