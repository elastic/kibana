# kbn-analytics

kbn-analytics
- reporting methods
- batch logic
- sending to API


Telemetry plugin
- API endpoint
- saving to saved objects
- collector logic
- exposes kbn-analytics reporting methods
- provide http method to kbn-analytics


Kibana plugins
- require Telemetry as optional dep
- use reporting methods in browser to report user interactions



---



function createMemoryReport() {
  // performance.mozMemory
  // performance.memory;
  return {

  }
}

---

Batching


submit report -> save into localstorage -> flush every interval



