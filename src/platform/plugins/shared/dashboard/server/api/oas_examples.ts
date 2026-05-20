/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from './types';
import type { DashboardCreateResponseBody } from './create';
import type { DashboardReadResponseBody } from './read';
import type { DashboardSearchResponseBody } from './search';
import type { DashboardUpdateResponseBody } from './update';

const dashboardApiOverviewDescription =
  'A [dashboard](https://www.elastic.co/docs/explore-analyze/dashboards) is a collection of panels arranged on a grid. Each panel can contain a visualization, a Discover session, an image, markdown text, or an interactive filter control. Use this API to create and manage dashboards programmatically.\n' +
  '\n' +
  '## When to use this API\n' +
  '\n' +
  '- Use this API to define a complete, self-contained dashboard in a single payload, including inline visualizations (both data view and ES|QL based), controls, and filters.\n' +
  '- Use the [Visualizations API](visualizations#tag/Visualizations/operation/post-visualizations) to create reusable charts saved to your [visualization library](https://www.elastic.co/docs/explore-analyze/visualize/visualize-library). You can then embed them in dashboards as linked panels using their ID.\n' +
  '\n' +
  '## Get started\n' +
  '\n' +
  'Before you begin:\n' +
  '\n' +
  '- **Authentication**: Refer to [Authentication](https://www.elastic.co/docs/api/doc/kibana#authentication) in the Kibana API documentation.\n' +
  '- **CSRF protection**: Write operations (`POST`, `PUT`, `DELETE`) require the `kbn-xsrf: true` header.\n' +
  '- **Spaces**: If you use non-default [Kibana spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces), prepend `s/{space_id}/` to the path.\n' +
  '\n' +
  '### Try it now\n' +
  '\n' +
  'Create your first dashboard right now. The following example creates a dashboard with an ES|QL line chart showing log entries over time. You can run it as-is once you have the [Kibana sample logs dataset](https://www.elastic.co/docs/manage-data/ingest/sample-data) installed:\n' +
  '\n' +
  '```bash\n' +
  'curl -X POST "${KIBANA_URL}/api/dashboards" \\\n' +
  '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
  '  -H "kbn-xsrf: true" \\\n' +
  '  -H "Content-Type: application/json" \\\n' +
  "  -d '{\n" +
  '    "title": "My first API dashboard",\n' +
  '    "panels": [\n' +
  '      {\n' +
  '        "grid": {\n' +
  '          "x": 0,\n' +
  '          "y": 0,\n' +
  '          "w": 24,\n' +
  '          "h": 10\n' +
  '        },\n' +
  '        "type": "vis",\n' +
  '        "config": {\n' +
  '          "type": "xy",\n' +
  '          "title": "Total log entries over time",\n' +
  '          "layers": [\n' +
  '            {\n' +
  '              "type": "line",\n' +
  '              "data_source": {\n' +
  '                "type": "esql",\n' +
  '                "query": "FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
  '              },\n' +
  '              "x": {\n' +
  '                "column": "BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
  '              },\n' +
  '              "y": [\n' +
  '                {\n' +
  '                  "column": "count"\n' +
  '                }\n' +
  '              ]\n' +
  '            }\n' +
  '          ],\n' +
  '          "axis": {\n' +
  '            "x": {\n' +
  '              "title": {\n' +
  '                "visible": false\n' +
  '              }\n' +
  '            }\n' +
  '          }\n' +
  '        }\n' +
  '      }\n' +
  '    ]\n' +
  "  }'\n" +
  '```\n' +
  '\n' +
  'All examples on this page use [Kibana sample datasets](https://www.elastic.co/docs/manage-data/ingest/sample-data) (`kibana_sample_data_logs`, `kibana_sample_data_ecommerce`, `kibana_sample_data_flights`). To use your own data, replace the `FROM` pattern and field references.\n' +
  '\n' +
  '### Dashboard structure\n' +
  '\n' +
  'A [dashboard](https://www.elastic.co/docs/explore-analyze/dashboards) is structured as follows:\n' +
  '\n' +
  '- **`title`** (required): the display name of the dashboard.\n' +
  '- **`panels`**: array of items placed on a 48-column grid. Each item has a `type`, a `grid` position (`x`, `y`, `w`, `h`), and a `config`. Two item shapes are supported:\n' +
  "  - **Panel**: any content type, including visualizations, Discover sessions, images, markdown, and filter controls. The `type` field determines the panel's content and the structure of its `config`.\n" +
  '  - **Section**: a collapsible group of panels. Use sections to organize a large dashboard into logical groups. A section has a `grid.y` position and its own nested `panels` array.\n' +
  '\n' +
  '  The grid is 48 columns wide. Use `w: 48` for a full-width panel, `w: 24` for half-width, and so on. Height (`h`) and vertical position (`y`) are in grid rows with no fixed maximum.\n' +
  '- **`pinned_panels`**: filter controls pinned at the top of the dashboard that apply to all panels. Filter controls placed in `panels` apply only to panels in the same section.\n' +
  '- **`filters`**, **`query`**, **`time_range`**: filter the data displayed across all panels.\n' +
  '\n' +
  '### Panel types\n' +
  '\n' +
  'The `type` field in each panel determines what it contains and the structure of its `config`:\n' +
  '\n' +
  '| Type | Description |\n' +
  '|------|-------------|\n' +
  '| `vis` | Visualization (bar, line, metric, and so on), supports both data view and ES&#124;QL queries |\n' +
  '| `discover_session` | Discover session |\n' +
  '| `image` | Image |\n' +
  '| `markdown` | Markdown text |\n' +
  '| `esql_control` | ES&#124;QL variable control |\n' +
  '| `options_list_control` | Dropdown filter by field value |\n' +
  '| `range_slider_control` | Slider filter by numeric range |\n' +
  '| `time_slider_control` | Time range slider |\n' +
  '\n' +
  'Additional panel types for observability use cases:\n' +
  '\n' +
  '| Type | Description |\n' +
  '|------|-------------|\n' +
  '| `slo_alerts` | SLO alerts |\n' +
  '| `slo_burn_rate` | SLO burn rate |\n' +
  '| `slo_error_budget` | SLO error budget |\n' +
  '| `slo_overview` | SLO overview |\n' +
  '| `synthetics_monitors` | Synthetics monitors |\n' +
  '| `synthetics_stats_overview` | Synthetics stats overview |\n' +
  '\n' +
  '> info\n' +
  '> The following panel types are supported in the Kibana UI but not yet by the REST API: `map`, `legacy_vis`, `links`, `field_stats_table`, `aiops_change_point_chart`, `aiops_log_rate_analysis`, `aiops_pattern_analysis`. Write operations (`POST`, `PUT`) return a `400` error when these panel types are included. Read operations (`GET`) strip these panels from the response and include them in a list of warnings.\n' +
  '\n' +
  '### Embedding library items\n' +
  '\n' +
  '`vis`, `discover_session`, and `markdown` panels can be embedded **inline** (full config stored in the dashboard) or **linked from library** (references a library item by ID).\n' +
  '\n' +
  'For the full `config` schema for visualization panels, including chart types, metric operations, and breakdowns, refer to the [Visualizations API](visualizations#tag/Visualizations/operation/post-visualizations).\n' +
  '\n' +
  '- **Inline**: use when the panel is specific to this dashboard or must work across Kibana spaces. The panel configuration goes directly inside `config`:\n' +
  '\n' +
  '  ```json\n' +
  '  {\n' +
  '    "grid": {\n' +
  '      "x": 0,\n' +
  '      "y": 0,\n' +
  '      "w": 12,\n' +
  '      "h": 8\n' +
  '    },\n' +
  '    "type": "vis",\n' +
  '    "config": {\n' +
  '      "type": "metric",\n' +
  '      "title": "Average bytes",\n' +
  '      "data_source": {\n' +
  '        "type": "data_view_spec",\n' +
  '        "index_pattern": "kibana_sample_data_logs",\n' +
  '        "time_field": "timestamp"\n' +
  '      },\n' +
  '      "metrics": [\n' +
  '        {\n' +
  '          "type": "primary",\n' +
  '          "operation": "average",\n' +
  '          "field": "bytes"\n' +
  '        }\n' +
  '      ]\n' +
  '    }\n' +
  '  }\n' +
  '  ```\n' +
  '\n' +
  '- **Linked from library**: references an item in your library by its ID. Use `ref_id` with any supported panel type (`vis`, `discover_session`, `markdown`). Use the [Visualizations API](visualizations#tag/Visualizations/operation/post-visualizations) to create and retrieve IDs for visualization items.\n' +
  '\n' +
  '  ```json\n' +
  '  {\n' +
  '    "grid": {\n' +
  '      "x": 0,\n' +
  '      "y": 0,\n' +
  '      "w": 12,\n' +
  '      "h": 8\n' +
  '    },\n' +
  '    "type": "vis",\n' +
  '    "config": {\n' +
  '      "ref_id": "1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d"\n' +
  '    }\n' +
  '  }\n' +
  '  ```\n' +
  '\n' +
  '### ES|QL visualizations\n' +
  '\n' +
  'To create ES|QL-based charts, embed them inline as `vis` panels and set `data_source.type` to `"esql"`.\n' +
  '\n' +
  '- **`metric` charts**: reference query result columns in `metrics` using `column`:\n' +
  '\n' +
  '  ```json\n' +
  '  {\n' +
  '    "grid": {\n' +
  '      "x": 0,\n' +
  '      "y": 0,\n' +
  '      "w": 12,\n' +
  '      "h": 6\n' +
  '    },\n' +
  '    "type": "vis",\n' +
  '    "config": {\n' +
  '      "type": "metric",\n' +
  '      "title": "Total requests",\n' +
  '      "data_source": {\n' +
  '        "type": "esql",\n' +
  '        "query": "FROM logs-* | STATS count = COUNT()"\n' +
  '      },\n' +
  '      "metrics": [\n' +
  '        {\n' +
  '          "type": "primary",\n' +
  '          "column": "count"\n' +
  '        }\n' +
  '      ]\n' +
  '    }\n' +
  '  }\n' +
  '  ```\n' +
  '\n' +
  "- **`xy` charts**: `data_source` goes inside each layer. Use `BUCKET(@timestamp, 75, ?_tstart, ?_tend)` to align time-series buckets with the dashboard's selected time range. For a complete xy chart example, see the [Create a dashboard](#operation/post-dashboards) endpoint.\n";

const dashboardCreateCodeSamples = [
  {
    lang: 'cURL',
    label: 'Create a dashboard (simple) - cURL',
    source:
      'curl -X POST "${KIBANA_URL}/api/dashboards" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "title": "Web logs overview",\n' +
      '  "access_control": { "access_mode": "write_restricted" },\n' +
      '  "panels": [\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 0,\n' +
      '        "y": 0,\n' +
      '        "w": 24,\n' +
      '        "h": 15\n' +
      '      },\n' +
      '      "type": "markdown",\n' +
      '      "config": {\n' +
      '        "content": "## Web logs overview\\n\\n&nbsp;\\n\\nCreated with the [Dashboards API](https://www.elastic.co/docs/api/doc/kibana) using the Kibana sample web logs dataset (`kibana_sample_data_logs`). Contains:\\n- This markdown panel\\n- 2 metrics, showing request count and average response size\\n- A line chart based on an ES|QL query\\n\\n&nbsp;\\n\\n&nbsp;\\n\\n[Learn more about dashboards](https://www.elastic.co/docs/explore-analyze/dashboards)"\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 24,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "count"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 36,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "average",\n' +
      '            "field": "bytes"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 24,\n' +
      '        "y": 5,\n' +
      '        "w": 24,\n' +
      '        "h": 10\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "xy",\n' +
      '        "title": "Requests over time",\n' +
      '        "layers": [\n' +
      '          {\n' +
      '            "type": "line",\n' +
      '            "data_source": {\n' +
      '              "type": "esql",\n' +
      '              "query": "FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "x": {\n' +
      '              "column": "BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "y": [\n' +
      '              {\n' +
      '                "column": "count"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        ],\n' +
      '        "axis": {\n' +
      '          "x": {\n' +
      '            "title": {\n' +
      '              "visible": false\n' +
      '            }\n' +
      '          }\n' +
      '        }\n' +
      '      }\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Create a dashboard (simple) - Console',
    source:
      'POST kbn:/api/dashboards\n' +
      '{\n' +
      '  "title": "Web logs overview",\n' +
      '  "panels": [\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 0,\n' +
      '        "y": 0,\n' +
      '        "w": 24,\n' +
      '        "h": 15\n' +
      '      },\n' +
      '      "type": "markdown",\n' +
      '      "config": {\n' +
      '        "content": "## Web logs overview\\n\\n&nbsp;\\n\\nCreated with the [Dashboards API](https://www.elastic.co/docs/api/doc/kibana) using the Kibana sample web logs dataset (`kibana_sample_data_logs`). Contains:\\n- This markdown panel\\n- 2 metrics, showing request count and average response size\\n- A line chart based on an ES|QL query\\n\\n&nbsp;\\n\\n&nbsp;\\n\\n[Learn more about dashboards](https://www.elastic.co/docs/explore-analyze/dashboards)"\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 24,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "count"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 36,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "average",\n' +
      '            "field": "bytes"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 24,\n' +
      '        "y": 5,\n' +
      '        "w": 24,\n' +
      '        "h": 10\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "xy",\n' +
      '        "title": "Requests over time",\n' +
      '        "layers": [\n' +
      '          {\n' +
      '            "type": "line",\n' +
      '            "data_source": {\n' +
      '              "type": "esql",\n' +
      '              "query": "FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "x": {\n' +
      '              "column": "BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "y": [\n' +
      '              {\n' +
      '                "column": "count"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        ],\n' +
      '        "axis": {\n' +
      '          "x": {\n' +
      '            "title": {\n' +
      '              "visible": false\n' +
      '            }\n' +
      '          }\n' +
      '        }\n' +
      '      }\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
  {
    lang: 'cURL',
    label: 'Create a dashboard (with sections and controls) - cURL',
    source:
      'curl -X POST "${KIBANA_URL}/api/dashboards" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "title": "Operations overview",\n' +
      '  "time_range": {\n' +
      '    "from": "now-7d",\n' +
      '    "to": "now"\n' +
      '  },\n' +
      '  "pinned_panels": [\n' +
      '    {\n' +
      '      "type": "options_list_control",\n' +
      '      "width": "medium",\n' +
      '      "grow": true,\n' +
      '      "config": {\n' +
      '        "title": "Response code",\n' +
      '        "data_view_id": "90943e30-9a47-11e8-b64d-95841ca0b247",\n' +
      '        "field_name": "response.keyword"\n' +
      '      }\n' +
      '    }\n' +
      '  ],\n' +
      '  "panels": [\n' +
      '    {\n' +
      '      "title": "Key metrics",\n' +
      '      "collapsed": false,\n' +
      '      "grid": {\n' +
      '        "y": 0\n' +
      '      },\n' +
      '      "panels": [\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 0,\n' +
      '            "y": 0,\n' +
      '            "w": 12,\n' +
      '            "h": 5\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "metric",\n' +
      '            "data_source": {\n' +
      '              "type": "data_view_spec",\n' +
      '              "index_pattern": "kibana_sample_data_logs",\n' +
      '              "time_field": "timestamp"\n' +
      '            },\n' +
      '            "metrics": [\n' +
      '              {\n' +
      '                "type": "primary",\n' +
      '                "operation": "count"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        },\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 12,\n' +
      '            "y": 0,\n' +
      '            "w": 12,\n' +
      '            "h": 5\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "metric",\n' +
      '            "data_source": {\n' +
      '              "type": "data_view_spec",\n' +
      '              "index_pattern": "kibana_sample_data_logs",\n' +
      '              "time_field": "timestamp"\n' +
      '            },\n' +
      '            "metrics": [\n' +
      '              {\n' +
      '                "type": "primary",\n' +
      '                "operation": "average",\n' +
      '                "field": "bytes"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        }\n' +
      '      ]\n' +
      '    },\n' +
      '    {\n' +
      '      "title": "Traffic trends",\n' +
      '      "collapsed": false,\n' +
      '      "grid": {\n' +
      '        "y": 8\n' +
      '      },\n' +
      '      "panels": [\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 0,\n' +
      '            "y": 0,\n' +
      '            "w": 24,\n' +
      '            "h": 10\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "xy",\n' +
      '            "title": "Requests over time",\n' +
      '            "layers": [\n' +
      '              {\n' +
      '                "type": "line",\n' +
      '                "data_source": {\n' +
      '                  "type": "data_view_spec",\n' +
      '                  "index_pattern": "kibana_sample_data_logs",\n' +
      '                  "time_field": "timestamp"\n' +
      '                },\n' +
      '                "x": {\n' +
      '                  "operation": "date_histogram",\n' +
      '                  "field": "timestamp"\n' +
      '                },\n' +
      '                "y": [\n' +
      '                  {\n' +
      '                    "operation": "count"\n' +
      '                  }\n' +
      '                ]\n' +
      '              }\n' +
      '            ],\n' +
      '            "axis": {\n' +
      '              "x": {\n' +
      '                "title": {\n' +
      '                  "visible": false\n' +
      '                }\n' +
      '              }\n' +
      '            }\n' +
      '          }\n' +
      '        },\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 24,\n' +
      '            "y": 0,\n' +
      '            "w": 24,\n' +
      '            "h": 10\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "xy",\n' +
      '            "title": "Requests over time (ES|QL)",\n' +
      '            "layers": [\n' +
      '              {\n' +
      '                "type": "line",\n' +
      '                "data_source": {\n' +
      '                  "type": "esql",\n' +
      '                  "query": "FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '                },\n' +
      '                "x": {\n' +
      '                  "column": "BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '                },\n' +
      '                "y": [\n' +
      '                  {\n' +
      '                    "column": "count"\n' +
      '                  }\n' +
      '                ]\n' +
      '              }\n' +
      '            ],\n' +
      '            "axis": {\n' +
      '              "x": {\n' +
      '                "title": {\n' +
      '                  "visible": false\n' +
      '                }\n' +
      '              }\n' +
      '            }\n' +
      '          }\n' +
      '        }\n' +
      '      ]\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Create a dashboard (with sections and controls) - Console',
    source:
      'POST kbn:/api/dashboards\n' +
      '{\n' +
      '  "title": "Operations overview",\n' +
      '  "time_range": {\n' +
      '    "from": "now-7d",\n' +
      '    "to": "now"\n' +
      '  },\n' +
      '  "pinned_panels": [\n' +
      '    {\n' +
      '      "type": "options_list_control",\n' +
      '      "width": "medium",\n' +
      '      "grow": true,\n' +
      '      "config": {\n' +
      '        "title": "Response code",\n' +
      '        "data_view_id": "90943e30-9a47-11e8-b64d-95841ca0b247",\n' +
      '        "field_name": "response.keyword"\n' +
      '      }\n' +
      '    }\n' +
      '  ],\n' +
      '  "panels": [\n' +
      '    {\n' +
      '      "title": "Key metrics",\n' +
      '      "collapsed": false,\n' +
      '      "grid": {\n' +
      '        "y": 0\n' +
      '      },\n' +
      '      "panels": [\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 0,\n' +
      '            "y": 0,\n' +
      '            "w": 12,\n' +
      '            "h": 5\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "metric",\n' +
      '            "data_source": {\n' +
      '              "type": "data_view_spec",\n' +
      '              "index_pattern": "kibana_sample_data_logs",\n' +
      '              "time_field": "timestamp"\n' +
      '            },\n' +
      '            "metrics": [\n' +
      '              {\n' +
      '                "type": "primary",\n' +
      '                "operation": "count"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        },\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 12,\n' +
      '            "y": 0,\n' +
      '            "w": 12,\n' +
      '            "h": 5\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "metric",\n' +
      '            "data_source": {\n' +
      '              "type": "data_view_spec",\n' +
      '              "index_pattern": "kibana_sample_data_logs",\n' +
      '              "time_field": "timestamp"\n' +
      '            },\n' +
      '            "metrics": [\n' +
      '              {\n' +
      '                "type": "primary",\n' +
      '                "operation": "average",\n' +
      '                "field": "bytes"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        }\n' +
      '      ]\n' +
      '    },\n' +
      '    {\n' +
      '      "title": "Traffic trends",\n' +
      '      "collapsed": false,\n' +
      '      "grid": {\n' +
      '        "y": 8\n' +
      '      },\n' +
      '      "panels": [\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 0,\n' +
      '            "y": 0,\n' +
      '            "w": 24,\n' +
      '            "h": 10\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "xy",\n' +
      '            "title": "Requests over time",\n' +
      '            "layers": [\n' +
      '              {\n' +
      '                "type": "line",\n' +
      '                "data_source": {\n' +
      '                  "type": "data_view_spec",\n' +
      '                  "index_pattern": "kibana_sample_data_logs",\n' +
      '                  "time_field": "timestamp"\n' +
      '                },\n' +
      '                "x": {\n' +
      '                  "operation": "date_histogram",\n' +
      '                  "field": "timestamp"\n' +
      '                },\n' +
      '                "y": [\n' +
      '                  {\n' +
      '                    "operation": "count"\n' +
      '                  }\n' +
      '                ]\n' +
      '              }\n' +
      '            ],\n' +
      '            "axis": {\n' +
      '              "x": {\n' +
      '                "title": {\n' +
      '                  "visible": false\n' +
      '                }\n' +
      '              }\n' +
      '            }\n' +
      '          }\n' +
      '        },\n' +
      '        {\n' +
      '          "grid": {\n' +
      '            "x": 24,\n' +
      '            "y": 0,\n' +
      '            "w": 24,\n' +
      '            "h": 10\n' +
      '          },\n' +
      '          "type": "vis",\n' +
      '          "config": {\n' +
      '            "type": "xy",\n' +
      '            "title": "Requests over time (ES|QL)",\n' +
      '            "layers": [\n' +
      '              {\n' +
      '                "type": "line",\n' +
      '                "data_source": {\n' +
      '                  "type": "esql",\n' +
      '                  "query": "FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '                },\n' +
      '                "x": {\n' +
      '                  "column": "BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '                },\n' +
      '                "y": [\n' +
      '                  {\n' +
      '                    "column": "count"\n' +
      '                  }\n' +
      '                ]\n' +
      '              }\n' +
      '            ],\n' +
      '            "axis": {\n' +
      '              "x": {\n' +
      '                "title": {\n' +
      '                  "visible": false\n' +
      '                }\n' +
      '              }\n' +
      '            }\n' +
      '          }\n' +
      '        }\n' +
      '      ]\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
];

const dashboardSearchCodeSamples = [
  {
    lang: 'cURL',
    label: 'Search dashboards - cURL',
    source:
      'curl -X GET "${KIBANA_URL}/api/dashboards?query=web+logs&per_page=10" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}"\n',
  },
  {
    lang: 'Console',
    label: 'Search dashboards - Console',
    source: 'GET kbn:/api/dashboards?query=web+logs&per_page=10\n',
  },
];

const dashboardReadCodeSamples = [
  {
    lang: 'cURL',
    label: 'Get a dashboard - cURL',
    source:
      'curl -X GET "${KIBANA_URL}/api/dashboards/3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}"\n',
  },
  {
    lang: 'Console',
    label: 'Get a dashboard - Console',
    source: 'GET kbn:/api/dashboards/3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b\n',
  },
];

const dashboardUpdateDescription =
  'Creates a new dashboard with the given ID if none exists, or replaces the complete state of an\n' +
  'existing one.\n' +
  '\n' +
  '> warn\n' +
  '> This is a full replacement. Any panels not included in the request body are permanently\n' +
  '> removed. To make targeted changes, retrieve the current state first with\n' +
  '> GET /api/dashboards/{id}, apply your changes, and submit the full updated object.\n' +
  '\n' +
  'You can optionally include `access_control.access_mode` to change the dashboard access mode.\n' +
  'If the authenticated user is not authorized to change access mode for the target dashboard,\n' +
  'the request returns a `403` response with a descriptive `message`.\n';

const dashboardUpdateCodeSamples = [
  {
    lang: 'cURL',
    label: 'Update a dashboard - cURL',
    source:
      'curl -X PUT "${KIBANA_URL}/api/dashboards/3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "title": "Web logs overview",\n' +
      '  "panels": [\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 0,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "count"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 12,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "average",\n' +
      '            "field": "bytes"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 0,\n' +
      '        "y": 8,\n' +
      '        "w": 24,\n' +
      '        "h": 10\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "xy",\n' +
      '        "title": "Requests over time",\n' +
      '        "layers": [\n' +
      '          {\n' +
      '            "type": "line",\n' +
      '            "data_source": {\n' +
      '              "type": "esql",\n' +
      '              "query": "FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "x": {\n' +
      '              "column": "BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "y": [\n' +
      '              {\n' +
      '                "column": "count"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        ],\n' +
      '        "axis": {\n' +
      '          "x": {\n' +
      '            "title": {\n' +
      '              "visible": false\n' +
      '            }\n' +
      '          }\n' +
      '        }\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 24,\n' +
      '        "y": 8,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "unique_count",\n' +
      '            "field": "clientip"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Update a dashboard - Console',
    source:
      'PUT kbn:/api/dashboards/3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b\n' +
      '{\n' +
      '  "title": "Web logs overview",\n' +
      '  "panels": [\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 0,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "count"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 12,\n' +
      '        "y": 0,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "average",\n' +
      '            "field": "bytes"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 0,\n' +
      '        "y": 8,\n' +
      '        "w": 24,\n' +
      '        "h": 10\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "xy",\n' +
      '        "title": "Requests over time",\n' +
      '        "layers": [\n' +
      '          {\n' +
      '            "type": "line",\n' +
      '            "data_source": {\n' +
      '              "type": "esql",\n' +
      '              "query": "FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "x": {\n' +
      '              "column": "BUCKET(@timestamp, 75, ?_tstart, ?_tend)"\n' +
      '            },\n' +
      '            "y": [\n' +
      '              {\n' +
      '                "column": "count"\n' +
      '              }\n' +
      '            ]\n' +
      '          }\n' +
      '        ],\n' +
      '        "axis": {\n' +
      '          "x": {\n' +
      '            "title": {\n' +
      '              "visible": false\n' +
      '            }\n' +
      '          }\n' +
      '        }\n' +
      '      }\n' +
      '    },\n' +
      '    {\n' +
      '      "grid": {\n' +
      '        "x": 24,\n' +
      '        "y": 8,\n' +
      '        "w": 12,\n' +
      '        "h": 5\n' +
      '      },\n' +
      '      "type": "vis",\n' +
      '      "config": {\n' +
      '        "type": "metric",\n' +
      '        "data_source": {\n' +
      '          "type": "data_view_spec",\n' +
      '          "index_pattern": "kibana_sample_data_logs",\n' +
      '          "time_field": "timestamp"\n' +
      '        },\n' +
      '        "metrics": [\n' +
      '          {\n' +
      '            "type": "primary",\n' +
      '            "operation": "unique_count",\n' +
      '            "field": "clientip"\n' +
      '          }\n' +
      '        ]\n' +
      '      }\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
];

const dashboardDeleteCodeSamples = [
  {
    lang: 'cURL',
    label: 'Delete a dashboard - cURL',
    source:
      'curl -X DELETE "${KIBANA_URL}/api/dashboards/3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true"\n',
  },
  {
    lang: 'Console',
    label: 'Delete a dashboard - Console',
    source: 'DELETE kbn:/api/dashboards/3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b\n',
  },
];

const dashboardCreateRequestExamples = {
  createDashboard: {
    summary: 'Create a simple dashboard',
    value: {
      title: 'Web logs overview',
      panels: [
        {
          grid: {
            x: 0,
            y: 0,
            w: 24,
            h: 15,
          },
          type: 'markdown',
          config: {
            content:
              '## Web logs overview\n' +
              '\n' +
              '&nbsp;\n' +
              '\n' +
              'Created with the [Dashboards API](https://www.elastic.co/docs/api/doc/kibana) using the Kibana sample web logs dataset (`kibana_sample_data_logs`). Contains:\n' +
              '- This markdown panel\n' +
              '- 2 metrics, showing request count and average response size\n' +
              '- A line chart based on an ES|QL query\n' +
              '\n' +
              '&nbsp;\n' +
              '\n' +
              '&nbsp;\n' +
              '\n' +
              '[Learn more about dashboards](https://www.elastic.co/docs/explore-analyze/dashboards)',
          },
        },
        {
          grid: {
            x: 24,
            y: 0,
            w: 12,
            h: 5,
          },
          type: 'vis',
          config: {
            type: 'metric',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'kibana_sample_data_logs',
              time_field: 'timestamp',
            },
            metrics: [
              {
                type: 'primary',
                operation: 'count',
              },
            ],
          },
        },
        {
          grid: {
            x: 36,
            y: 0,
            w: 12,
            h: 5,
          },
          type: 'vis',
          config: {
            type: 'metric',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'kibana_sample_data_logs',
              time_field: 'timestamp',
            },
            metrics: [
              {
                type: 'primary',
                operation: 'average',
                field: 'bytes',
              },
            ],
          },
        },
        {
          grid: {
            x: 24,
            y: 5,
            w: 24,
            h: 10,
          },
          type: 'vis',
          config: {
            type: 'xy',
            title: 'Requests over time',
            layers: [
              {
                type: 'line',
                data_source: {
                  type: 'esql',
                  query:
                    'FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                },
                x: {
                  column: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                },
                y: [
                  {
                    column: 'count',
                  },
                ],
              },
            ],
            axis: {
              x: {
                title: {
                  visible: false,
                },
              },
            },
          },
        },
      ],
    } satisfies Partial<DashboardState>,
  },
  createDashboardWithSectionsAndControls: {
    summary: 'Create a dashboard with sections and controls',
    value: {
      title: 'Operations overview',
      time_range: {
        from: 'now-7d',
        to: 'now',
      },
      pinned_panels: [
        {
          type: 'options_list_control',
          width: 'medium',
          grow: true,
          config: {
            title: 'Response code',
            data_view_id: '90943e30-9a47-11e8-b64d-95841ca0b247',
            field_name: 'response.keyword',
            use_global_filters: true,
            ignore_validations: false,
            exclude: false,
            exists_selected: false,
            run_past_timeout: false,
            search_technique: 'prefix',
            selected_options: [],
            single_select: false,
            sort: {
              by: '_count',
              direction: 'desc',
            },
          },
        },
      ],
      panels: [
        {
          title: 'Key metrics',
          collapsed: false,
          grid: {
            y: 0,
          },
          panels: [
            {
              grid: {
                x: 0,
                y: 0,
                w: 12,
                h: 5,
              },
              type: 'vis',
              config: {
                type: 'metric',
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'kibana_sample_data_logs',
                  time_field: 'timestamp',
                },
                metrics: [
                  {
                    type: 'primary',
                    operation: 'count',
                  },
                ],
              },
            },
            {
              grid: {
                x: 12,
                y: 0,
                w: 12,
                h: 5,
              },
              type: 'vis',
              config: {
                type: 'metric',
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'kibana_sample_data_logs',
                  time_field: 'timestamp',
                },
                metrics: [
                  {
                    type: 'primary',
                    operation: 'average',
                    field: 'bytes',
                  },
                ],
              },
            },
          ],
        },
        {
          title: 'Traffic trends',
          collapsed: false,
          grid: {
            y: 8,
          },
          panels: [
            {
              grid: {
                x: 0,
                y: 0,
                w: 24,
                h: 10,
              },
              type: 'vis',
              config: {
                type: 'xy',
                title: 'Requests over time',
                layers: [
                  {
                    type: 'line',
                    data_source: {
                      type: 'data_view_spec',
                      index_pattern: 'kibana_sample_data_logs',
                      time_field: 'timestamp',
                    },
                    x: {
                      operation: 'date_histogram',
                      field: 'timestamp',
                    },
                    y: [
                      {
                        operation: 'count',
                      },
                    ],
                  },
                ],
                axis: {
                  x: {
                    title: {
                      visible: false,
                    },
                  },
                },
              },
            },
            {
              grid: {
                x: 24,
                y: 0,
                w: 24,
                h: 10,
              },
              type: 'vis',
              config: {
                type: 'xy',
                title: 'Requests over time (ES|QL)',
                layers: [
                  {
                    type: 'line',
                    data_source: {
                      type: 'esql',
                      query:
                        'FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                    },
                    x: {
                      column: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                    },
                    y: [
                      {
                        column: 'count',
                      },
                    ],
                  },
                ],
                axis: {
                  x: {
                    title: {
                      visible: false,
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    } satisfies Partial<DashboardState>,
  },
};

const dashboardUpdateRequestExamples = {
  updateDashboard: {
    summary: 'Update a dashboard',
    value: {
      title: 'Web logs overview',
      panels: [
        {
          grid: {
            x: 0,
            y: 0,
            w: 12,
            h: 5,
          },
          type: 'vis',
          config: {
            type: 'metric',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'kibana_sample_data_logs',
              time_field: 'timestamp',
            },
            metrics: [
              {
                type: 'primary',
                operation: 'count',
              },
            ],
          },
        },
        {
          grid: {
            x: 12,
            y: 0,
            w: 12,
            h: 5,
          },
          type: 'vis',
          config: {
            type: 'metric',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'kibana_sample_data_logs',
              time_field: 'timestamp',
            },
            metrics: [
              {
                type: 'primary',
                operation: 'average',
                field: 'bytes',
              },
            ],
          },
        },
        {
          grid: {
            x: 0,
            y: 8,
            w: 24,
            h: 10,
          },
          type: 'vis',
          config: {
            type: 'xy',
            title: 'Requests over time',
            layers: [
              {
                type: 'line',
                data_source: {
                  type: 'esql',
                  query:
                    'FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                },
                x: {
                  column: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                },
                y: [
                  {
                    column: 'count',
                  },
                ],
              },
            ],
            axis: {
              x: {
                title: {
                  visible: false,
                },
              },
            },
          },
        },
        {
          grid: {
            x: 24,
            y: 8,
            w: 12,
            h: 5,
          },
          type: 'vis',
          config: {
            type: 'metric',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'kibana_sample_data_logs',
              time_field: 'timestamp',
            },
            metrics: [
              {
                type: 'primary',
                operation: 'unique_count',
                field: 'clientip',
              },
            ],
          },
        },
      ],
    } satisfies Partial<DashboardState>,
  },
};

const dashboardCreateResponseExamples = {
  createDashboardResponse: {
    summary: 'Create dashboard response',
    description:
      'Response to creating a dashboard. Returns the generated ID, the full dashboard state in `data`, and metadata. Default option values are always returned even when not explicitly set in the request. Panel `id` values are generated automatically.\n',
    value: {
      id: '3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b',
      data: {
        options: {
          hide_panel_titles: false,
          hide_panel_borders: false,
          use_margins: true,
          auto_apply_filters: true,
          sync_colors: false,
          sync_cursor: true,
          sync_tooltips: false,
        },
        panels: [
          {
            grid: {
              x: 0,
              y: 0,
              w: 24,
              h: 15,
            },
            config: {
              content: '## Web logs overview',
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000001',
            type: 'markdown',
          },
          {
            grid: {
              x: 24,
              y: 0,
              w: 12,
              h: 5,
            },
            config: {
              title: '',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'count',
                  empty_as_null: false,
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000002',
            type: 'vis',
          },
          {
            grid: {
              x: 36,
              y: 0,
              w: 12,
              h: 5,
            },
            config: {
              title: '',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'average',
                  field: 'bytes',
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000003',
            type: 'vis',
          },
          {
            grid: {
              x: 24,
              y: 5,
              w: 24,
              h: 10,
            },
            config: {
              title: 'Requests over time',
              type: 'xy',
              layers: [
                {
                  type: 'line',
                  data_source: {
                    type: 'esql',
                    query:
                      'FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                  },
                  sampling: 1,
                  ignore_global_filters: false,
                  x: {
                    column: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                  },
                  y: [
                    {
                      column: 'count',
                      axis_id: 'y',
                    },
                  ],
                },
              ],
              axis: {
                x: {
                  title: {
                    visible: false,
                  },
                  ticks: {
                    visible: true,
                  },
                  grid: {
                    visible: true,
                  },
                  domain: {
                    type: 'fit',
                    rounding: false,
                  },
                  labels: {
                    orientation: 'horizontal',
                  },
                  scale: 'ordinal',
                },
                y: {
                  anchor: 'start',
                  title: {
                    visible: true,
                  },
                  scale: 'linear',
                  ticks: {
                    visible: true,
                  },
                  grid: {
                    visible: true,
                  },
                  domain: {
                    type: 'full',
                    rounding: true,
                  },
                  labels: {
                    orientation: 'horizontal',
                  },
                },
              },
              styling: {
                overlays: {
                  partial_buckets: {
                    visible: false,
                  },
                  current_time_marker: {
                    visible: false,
                  },
                },
                interpolation: 'linear',
                points: {
                  visibility: 'auto',
                },
              },
              legend: {
                visibility: 'hidden',
                placement: 'outside',
                position: 'right',
                layout: {
                  type: 'grid',
                  truncate: {
                    max_lines: 1,
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000003',
            type: 'vis',
          },
        ],
        pinned_panels: [],
        access_control: {
          access_mode: 'write_restricted',
        },
        title: 'Web logs overview',
      },
      meta: {
        created_at: '2026-04-13T10:00:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:00:00.000Z',
        version: 'WzEwMiwxXQ==',
      },
    } satisfies DashboardCreateResponseBody,
  },
};

const dashboardSearchResponseExamples = {
  searchDashboardsResponse: {
    summary: 'Search dashboards response',
    description:
      'Paginated list of dashboard summaries. Each item includes the ID, a subset of dashboard state fields (`title`, `time_range` if set), and metadata. Full panel content is not included - use the GET endpoint to retrieve a specific dashboard.\n',
    value: {
      dashboards: [
        {
          id: '3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b',
          data: {
            title: 'Web logs overview',
          },
          meta: {
            created_at: '2026-04-13T10:00:00.000Z',
            managed: false,
            updated_at: '2026-04-13T10:00:00.000Z',
            version: 'WzEwMiwxXQ==',
          },
        },
        {
          id: '7f2a1c40-e83b-11ef-a641-7d5b3f9e1c2a',
          data: {
            time_range: {
              from: 'now-7d',
              to: 'now',
            },
            title: 'Operations overview',
          },
          meta: {
            created_at: '2026-04-12T08:00:00.000Z',
            managed: false,
            updated_at: '2026-04-12T14:22:00.000Z',
            version: 'WzEwMSwxXQ==',
          },
        },
      ],
      page: 1,
      total: 2,
    } satisfies DashboardSearchResponseBody,
  },
};

const dashboardReadResponseExamples = {
  getDashboardResponse: {
    summary: 'Get dashboard response',
    description: 'The full dashboard state including all panels, options, and metadata.\n',
    value: {
      id: '3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b',
      data: {
        options: {
          hide_panel_titles: false,
          hide_panel_borders: false,
          use_margins: true,
          auto_apply_filters: true,
          sync_colors: false,
          sync_cursor: true,
          sync_tooltips: false,
        },
        title: 'Web logs overview',
        panels: [
          {
            grid: {
              x: 0,
              y: 0,
              w: 12,
              h: 8,
            },
            config: {
              title: 'Total requests',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'count',
                  empty_as_null: false,
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000001',
            type: 'vis',
          },
          {
            grid: {
              x: 12,
              y: 0,
              w: 12,
              h: 8,
            },
            config: {
              title: 'Average response size',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'average',
                  field: 'bytes',
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000002',
            type: 'vis',
          },
          {
            grid: {
              x: 0,
              y: 15,
              w: 24,
              h: 10,
            },
            config: {
              title: 'Requests over time',
              type: 'xy',
              layers: [
                {
                  type: 'line',
                  data_source: {
                    type: 'esql',
                    query:
                      'FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                  },
                  sampling: 1,
                  ignore_global_filters: false,
                  x: {
                    column: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                  },
                  y: [
                    {
                      column: 'count',
                      axis_id: 'y',
                    },
                  ],
                },
              ],
              axis: {
                x: {
                  title: {
                    visible: false,
                  },
                  ticks: {
                    visible: true,
                  },
                  grid: {
                    visible: true,
                  },
                  domain: {
                    type: 'fit',
                    rounding: false,
                  },
                  labels: {
                    orientation: 'horizontal',
                  },
                  scale: 'ordinal',
                },
                y: {
                  anchor: 'start',
                  title: {
                    visible: true,
                  },
                  scale: 'linear',
                  ticks: {
                    visible: true,
                  },
                  grid: {
                    visible: true,
                  },
                  domain: {
                    type: 'full',
                    rounding: true,
                  },
                  labels: {
                    orientation: 'horizontal',
                  },
                },
              },
              styling: {
                overlays: {
                  partial_buckets: {
                    visible: false,
                  },
                  current_time_marker: {
                    visible: false,
                  },
                },
                interpolation: 'linear',
                points: {
                  visibility: 'auto',
                },
              },
              legend: {
                visibility: 'hidden',
                placement: 'outside',
                position: 'right',
                layout: {
                  type: 'grid',
                  truncate: {
                    max_lines: 1,
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000003',
            type: 'vis',
          },
        ],
        pinned_panels: [],
      },
      meta: {
        created_at: '2026-04-13T10:00:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:00:00.000Z',
        version: 'WzEwMiwxXQ==',
      },
    } satisfies DashboardReadResponseBody,
  },
};

const dashboardUpdateResponseExamples = {
  updateDashboardResponse: {
    summary: 'Update dashboard response',
    description:
      'The complete updated dashboard state after a full replacement. Note that `meta.created_at` is not returned in update responses - use the GET endpoint to retrieve it.\n',
    value: {
      id: '3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b',
      data: {
        options: {
          hide_panel_titles: false,
          hide_panel_borders: false,
          use_margins: true,
          auto_apply_filters: true,
          sync_colors: false,
          sync_cursor: true,
          sync_tooltips: false,
        },
        panels: [
          {
            grid: {
              x: 0,
              y: 0,
              w: 24,
              h: 15,
            },
            config: {
              content:
                '## Web logs overview\n' +
                '\n' +
                '&nbsp;\n' +
                '\n' +
                'Created with the [Dashboards API](https://www.elastic.co/docs/api/doc/kibana) using the Kibana sample web logs dataset (`kibana_sample_data_logs`). Contains:\n' +
                '- This markdown panel\n' +
                '- 2 metrics, showing request count and average response size\n' +
                '- A line chart based on an ES|QL query\n' +
                '\n' +
                '&nbsp;\n' +
                '\n' +
                '&nbsp;\n' +
                '\n' +
                '[Learn more about dashboards](https://www.elastic.co/docs/explore-analyze/dashboards)',
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000001',
            type: 'markdown',
          },
          {
            grid: {
              x: 24,
              y: 0,
              w: 12,
              h: 5,
            },
            config: {
              title: '',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'count',
                  empty_as_null: false,
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000002',
            type: 'vis',
          },
          {
            grid: {
              x: 36,
              y: 0,
              w: 12,
              h: 5,
            },
            config: {
              title: '',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'average',
                  field: 'bytes',
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000003',
            type: 'vis',
          },
          {
            grid: {
              x: 24,
              y: 5,
              w: 24,
              h: 10,
            },
            config: {
              title: 'Requests over time',
              type: 'xy',
              layers: [
                {
                  type: 'line',
                  data_source: {
                    type: 'esql',
                    query:
                      'FROM kibana_sample_data_logs | STATS count = COUNT() BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                  },
                  sampling: 1,
                  ignore_global_filters: false,
                  x: {
                    column: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                  },
                  y: [
                    {
                      column: 'count',
                      axis_id: 'y',
                    },
                  ],
                },
              ],
              axis: {
                x: {
                  title: {
                    visible: false,
                  },
                  ticks: {
                    visible: true,
                  },
                  grid: {
                    visible: true,
                  },
                  domain: {
                    type: 'fit',
                    rounding: false,
                  },
                  labels: {
                    orientation: 'horizontal',
                  },
                  scale: 'ordinal',
                },
                y: {
                  anchor: 'start',
                  title: {
                    visible: true,
                  },
                  scale: 'linear',
                  ticks: {
                    visible: true,
                  },
                  grid: {
                    visible: true,
                  },
                  domain: {
                    type: 'full',
                    rounding: true,
                  },
                  labels: {
                    orientation: 'horizontal',
                  },
                },
              },
              styling: {
                overlays: {
                  partial_buckets: {
                    visible: false,
                  },
                  current_time_marker: {
                    visible: false,
                  },
                },
                interpolation: 'linear',
                points: {
                  visibility: 'auto',
                },
              },
              legend: {
                visibility: 'hidden',
                placement: 'outside',
                position: 'right',
                layout: {
                  type: 'grid',
                  truncate: {
                    max_lines: 1,
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000003',
            type: 'vis',
          },
          {
            grid: {
              x: 24,
              y: 8,
              w: 24,
              h: 10,
            },
            config: {
              title: 'Unique visitors',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'unique_count',
                  field: 'clientip',
                  empty_as_null: false,
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000004',
            type: 'vis',
          },
        ],
        pinned_panels: [],
        title: 'Web logs overview',
      },
      meta: {
        managed: false,
        updated_at: '2026-04-13T11:00:00.000Z',
        version: 'WzEwMywxXQ==',
      },
    } satisfies DashboardUpdateResponseBody,
  },
};

const dashboardUpdateCreatedResponseExamples = {
  createDashboardResponse: {
    summary: 'Create dashboard response (PUT)',
    description:
      'Response when PUT creates a new dashboard (no existing dashboard with the given ID). Returns the generated state and metadata. Default option values are always returned even when not explicitly set in the request.\n',
    value: {
      id: '3c4b8e10-d57a-11ef-9a52-4f3c2a8d0e1b',
      data: {
        options: {
          hide_panel_titles: false,
          hide_panel_borders: false,
          use_margins: true,
          auto_apply_filters: true,
          sync_colors: false,
          sync_cursor: true,
          sync_tooltips: false,
        },
        panels: [
          {
            grid: {
              x: 0,
              y: 0,
              w: 12,
              h: 5,
            },
            config: {
              title: '',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'kibana_sample_data_logs',
                time_field: 'timestamp',
              },
              type: 'metric',
              sampling: 1,
              ignore_global_filters: false,
              metrics: [
                {
                  type: 'primary',
                  operation: 'count',
                  empty_as_null: false,
                },
              ],
              styling: {
                primary: {
                  position: 'bottom',
                  labels: {
                    alignment: 'left',
                  },
                  value: {
                    sizing: 'auto',
                    alignment: 'right',
                  },
                },
              },
            },
            id: 'a1b2c3d4-0001-4000-8000-000000000001',
            type: 'vis',
          },
        ],
        pinned_panels: [],
        title: 'Web logs overview',
      },
      meta: {
        created_at: '2026-04-13T10:00:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:00:00.000Z',
        version: 'WzEwMiwxXQ==',
      },
    } satisfies DashboardUpdateResponseBody,
  },
};

export const getCreateDashboardOASOperationObject = () => ({
  description: dashboardApiOverviewDescription,
  'x-codeSamples': dashboardCreateCodeSamples,
  requestBody: {
    content: {
      'application/json': {
        examples: dashboardCreateRequestExamples,
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          examples: dashboardCreateResponseExamples,
        },
      },
    },
  },
});

export const getSearchDashboardOASOperationObject = () => ({
  'x-codeSamples': dashboardSearchCodeSamples,
  responses: {
    200: {
      content: {
        'application/json': {
          examples: dashboardSearchResponseExamples,
        },
      },
    },
  },
});

export const getReadDashboardOASOperationObject = () => ({
  'x-codeSamples': dashboardReadCodeSamples,
  responses: {
    200: {
      content: {
        'application/json': {
          examples: dashboardReadResponseExamples,
        },
      },
    },
  },
});

export const getUpdateDashboardOASOperationObject = () => ({
  description: dashboardUpdateDescription,
  'x-codeSamples': dashboardUpdateCodeSamples,
  requestBody: {
    content: {
      'application/json': {
        examples: dashboardUpdateRequestExamples,
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          examples: dashboardUpdateResponseExamples,
        },
      },
    },
    201: {
      content: {
        'application/json': {
          examples: dashboardUpdateCreatedResponseExamples,
        },
      },
    },
  },
});

export const getDeleteDashboardOASOperationObject = () => ({
  'x-codeSamples': dashboardDeleteCodeSamples,
});
