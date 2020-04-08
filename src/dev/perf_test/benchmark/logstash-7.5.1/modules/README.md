# Module settings and structure

## settings 

### logstash.yml

```
modules:
  - name: netflow
  var.output.elasticsearch.host: "es.mycloud.com"
  var.output.elasticsearch.user: "foo"
  var.output.elasticsearch.password: "password"
  var.input.tcp.port: 5606
```

### command-line

```
bin/logstash \
 --modules netflow \
 -M "netflow.var.output.elasticsearch.host=es.mycloud.com" \
 -M "netflow.var.output.elasticsearch.user=foo" \
 -M "netflow.var.output.elasticsearch.password=password" \
 -M "netflow.var.input.tcp.port=5606"
```

## Current Gem structure
```
GEM File structure
logstash-module-netflow
├── configuration
│   ├── elasticsearch
│   │   └── netflow.json
│   ├── kibana
│   │   ├── dashboard
│   │   │   └── netflow.json (contains '["dash1", "dash2"]')
│   │   │   └── dash1.json ("panelJSON" contains refs to visualization panels 1,2 and search 1)
│   │   │   └── dash2.json ("panelJSON" contains refs to visualization panel 3  and search 2)
│   │   ├── index-pattern
|   |   |   └── netflow.json
│   │   ├── search
|   |   |   └── search1.json
|   |   |   └── search2.json
│   │   └── vizualization
|   |   |   └── panel1.json
|   |   |   └── panel2.json
|   |   |   └── panel3.json
│   └── logstash
│       └── netflow.conf.erb
├── lib
│   └── logstash_registry.rb
└── logstash-module-netflow.gemspec
```
## Proposed multi-version Gem structure
```
GEM File structure
logstash-module-netflow
├── configuration
│   ├── elasticsearch
│   │   └── netflow.json
│   ├── kibana
│   │   ├── dashboard
│   │   │   └── netflow.json (contains '{"v5.5.0": ["dash1", "dash2"], "v6.0.4": ["dash1", "dash2"]')
│   │   │   └── v5.5.0
│   │   │   |   └── dash1.json ("panelJSON" contains refs to visualization panels 1,2 and search 1)
│   │   │   |   └── dash2.json ("panelJSON" contains refs to visualization panel 3  and search 2)
│   │   │   └── v6.0.4
│   │   │       └── dash1.json ("panelJSON" contains refs to visualization panels 1,2 and search 1)
│   │   │       └── dash2.json ("panelJSON" contains refs to visualization panel 3  and search 2)
│   │   ├── index-pattern
│   │   │   └── v5
|   |   |   |   └── netflow.json
│   │   │   └── v6
|   |   |       └── netflow.json
│   │   ├── search
│   │   │   └── v5
|   |   |   |   └── search1.json
|   |   |   |   └── search2.json
│   │   │   └── v6
|   |   |       └── search1.json
|   |   |       └── search2.json
│   │   └── vizualization
│   │   │   └── v5
|   |   |   |   └── panel1.json
|   |   |   |   └── panel2.json
|   |   |   |   └── panel3.json
│   │   │   └── v6
|   |   |       └── panel1.json
|   |   |       └── panel2.json
|   |   |       └── panel3.json
│   └── logstash
│       └── netflow.conf.erb
├── lib
│   └── logstash_registry.rb
└── logstash-module-netflow.gemspec
```
