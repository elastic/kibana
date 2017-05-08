import Boom from 'boom';

export function encodeNextPageId(page, pageCount, scrollId) {
  if (page > pageCount) {
    return undefined;
  }

  const json = JSON.stringify([ page, pageCount, scrollId ]);
  return Buffer.from(json, 'utf8').toString('base64');
}

export function decodeNextPageId(nextPageId) {
  try {
    const json = Buffer.from(nextPageId, 'base64').toString('utf8');
    const [page, pageCount, scrollId] = JSON.parse(json);
    return { page, pageCount, scrollId };
  } catch (error) {
    throw Boom.badRequest('invalid next_page_id');
  }
}
