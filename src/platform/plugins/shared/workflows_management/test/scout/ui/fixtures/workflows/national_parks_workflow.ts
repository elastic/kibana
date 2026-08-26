/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const nationalParksWorkflow = `
name: 🏔️ National Parks Demo
description: Creates an Elasticsearch index, loads sample national park data using bulk operations, searches for parks by category, and displays the results.
enabled: true
tags: ["demo", "getting-started"]
consts:
  indexName: national-parks
triggers:
  - type: manual
steps:
  - name: get_index
    type: elasticsearch.indices.exists
    with:
      index: "{{ consts.indexName }}"
  - name: check_if_index_exists
    type: if
    condition: 'steps.get_index.output : true'
    steps:
      - name: index_already_exists
        type: console
        with:
          message: "index: {{ consts.indexName }} already exists. Will proceed to delete it and re-create"
      - name: delete_index
        type: elasticsearch.indices.delete
        with:
          index: "{{ consts.indexName }}"
    else:
      - name: no_index_found
        type: console
        with:
          message: "index: {{ consts.indexName }} Not found. Will proceed to create"

  - name: create_parks_index
    type: elasticsearch.indices.create
    with:
      index: "{{ consts.indexName }}"
      mappings:
        properties:
          name: { type: text }
          category: { type: keyword }
          description: { type: text }
  - name: bulk_index_park_data
    type: elasticsearch.request
    with:
      method: POST
      path: /{{ consts.indexName }}/_bulk?refresh=wait_for
      headers:
        Content-Type: application/x-ndjson
      body: |
        {"index":{}}
        {"name": "Yellowstone National Park", "category": "geothermal", "description": "America's first national park, established in 1872, famous for Old Faithful geyser and diverse wildlife including grizzly bears, wolves, and herds of bison and elk."}
        {"index":{}}
        {"name": "Grand Canyon National Park", "category": "canyon", "description": "Home to the immense Grand Canyon, a mile deep gorge carved by the Colorado River, revealing millions of years of geological history in its colorful rock layers."}
        {"index":{}}
        {"name": "Yosemite National Park", "category": "mountain", "description": "Known for its granite cliffs, waterfalls, clear streams, giant sequoia groves, and biological diversity. El Capitan and Half Dome are iconic rock formations."}
        {"index":{}}
        {"name": "Zion National Park", "category": "canyon", "description": "Utah's first national park featuring cream, pink, and red sandstone cliffs soaring into a blue sky. Famous for the Narrows wade through the Virgin River."}
        {"index":{}}
        {"name": "Rocky Mountain National Park", "category": "mountain", "description": "Features mountain environments, from wooded forests to mountain tundra, with over 150 riparian lakes and diverse wildlife at various elevations."}
  - name: search_park_data
    type: elasticsearch.search
    with:
      index: "{{ consts.indexName }}"
      size: 5
      query:
        term:
          category: canyon
  - name: loop_over_results
    type: foreach
    foreach: "{{steps.search_park_data.output.hits.hits | json}}"
    steps:
      - name: process-item
        type: console
        with:
          message: "{{foreach.item._source.name}}"
`;
