import type { Client } from '@elastic/elasticsearch';

export async function deleteDataStream(client: Client, datastream: string, template: string) {
  await client.indices.deleteDataStream({ name: datastream });
  await client.indices.deleteIndexTemplate({ name: template });
}
