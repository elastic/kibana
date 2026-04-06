# Local Kibana dev – avoid 404

When running Kibana locally with `yarn start`:

1. **Start Elasticsearch first** (in one terminal):
   ```bash
   yarn es snapshot
   ```
   Wait until it reports Elasticsearch is ready.

2. **Start Kibana** (in another terminal):
   ```bash
   yarn start
   ```
   Wait until it reports Kibana is available.

3. **Use these URLs** (with `config/kibana.dev.yml` in place, Kibana runs on port 5601 with no base path):
   - Kibana home: **http://localhost:5601/**
   - Security Get Started: **http://localhost:5601/app/security/get_started**

If you see "This page isn't working" or **HTTP 404**:

- Confirm both Elasticsearch and Kibana are running (steps 1 and 2).
- Open **http://localhost:5601/** first; if that loads, then try **http://localhost:5601/app/security/get_started**.
- Do a hard refresh (Cmd+Shift+R / Ctrl+Shift+R) in case the browser cached an error.
