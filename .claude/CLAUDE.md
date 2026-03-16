../AGENTS.md

## Design Context

### Users
DevOps and SRE engineers who are monitoring infrastructure, debugging incidents, and analyzing logs and metrics. They work under pressure, often triaging problems in real time. The UI must support fast pattern recognition, dense data scanning, and confident decision-making without adding cognitive load.

### Brand Personality
Powerful, precise, calm. The interface should project competence and control — a tool that handles complexity without feeling chaotic. It should feel like a trusted instrument, not a consumer app.

### Aesthetic Direction
- **Theme**: Full light and dark mode support (Borealis theme via EUI) — treat both as first-class
- **Visual tone**: Data-dense but structured; clarity over decoration
- **References**: Terminal-like precision, professional monitoring tools (Grafana, Datadog dark mode aesthetics)
- **Anti-references**: Avoid generic SaaS dashboards, excessive whitespace, playful or consumer-app aesthetics
- **Component library**: EUI (Elastic UI) v113 with Borealis theme — always use EUI primitives, never reinvent

### Focus Areas
Dashboards & visualizations and Discover — panels, charts, layout, log exploration, and query UI.

### Design Principles
1. **Clarity over cleverness** — every element should serve comprehension; remove anything decorative that doesn't aid understanding
2. **Respect the data** — visualizations and layouts should make patterns immediately scannable; density is a feature, not a problem
3. **Theme parity** — every component must look intentional in both light and dark mode; never assume one default
4. **EUI-first** — use Elastic UI tokens (euiTheme.colors, euiTheme.size) and components exclusively; custom styles only when EUI has a gap
5. **Calm under pressure** — the UI should feel stable and controlled even when surfacing critical data; avoid alarming chrome or visual noise