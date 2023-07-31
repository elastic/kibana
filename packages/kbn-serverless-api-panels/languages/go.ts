/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { LanguageDefinition, Languages } from './types';

// TODO replace me
const docLinks = {
  goAdvancedConfig: '123123',
  goBasicConfig: 'a123123',
  goClient: '1123123',
};

export const goDefinition: LanguageDefinition = {
  advancedConfig: docLinks.goAdvancedConfig,
  basicConfig: docLinks.goBasicConfig,
  buildSearchQuery: `searchResp, err := es.Search().
  Index("books").
  Q("snow").
  Do(context.Background())

fmt.Println(searchResp, err)`,
  configureClient: ({ url, apiKey }) => `import (
  "context"
  "fmt"
  "log"
  "strings"
​
  "github.com/elastic/elasticsearch-serverless-go"
)

func main() {
  cfg := elasticsearch.Config{
    Address: "${url}",
    APIKey: "${apiKey}",
  }
  es, err := elasticsearch.NewClient(cfg)
  if err != nil {
    log.Fatalf("Error creating the client: %s", err)
  }
}`,
  docLink: docLinks.goClient,
  iconType: 'go.svg',
  id: Languages.GO,
  ingestData: `ingestResult, err := es.Bulk().
  Index("books").
  Raw(strings.NewReader(\`
{"index":{"_id":"9780553351927"}}
{"name":"Snow Crash","author":"Neal Stephenson","release_date":"1992-06-01","page_count": 470}
{ "index": { "_id": "9780441017225"}}
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index": { "_id": "9780451524935"}}
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index": { "_id": "9781451673319"}}
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index": { "_id": "9780060850524"}}
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index": { "_id": "9780385490818"}}
{"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}\n\`)).
  Do(context.Background())

fmt.Println(ingestResult, err)`,
  ingestDataIndex: ({ apiKey, url, indexName }) => `import (
  "context"
  "fmt"
  "log"
  "strings"
​
  "github.com/elastic/elasticsearch-serverless-go"
)
​
func main() {
  cfg := elasticsearch.Config{
    Address: "${url}",
    APIKey: "${apiKey}",
  }
  es, err := elasticsearch.NewClient(cfg)
  if err != nil {
    log.Fatalf("Error creating the client: %s", err)
  }
  res, err := es.Bulk().
    Index("${indexName}").
    Raw(strings.NewReader(\`
{ "index": { "_id": "1"}}
{"name": "foo", "title": "bar"}\n\`)).
    Do(context.Background())
  ​
  fmt.Println(res, err)
}`,
  installClient: 'go get -u github.com/elastic/elasticsearch-serverless-go@latest',
  name: i18n.translate('xpack.serverlessSearch.languages.go', {
    defaultMessage: 'Go',
  }),
  testConnection: `infores, err := es.Info().Do(context.Background())
if err != nil {
  log.Fatalf("Error getting response: %s", err)
}

fmt.Println(infores)`,
};
