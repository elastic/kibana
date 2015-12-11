module.exports = function createApiDocument(primary, included) {
  const doc = {data: primary};
  if (included) {
    doc.included = included;
  }

  return doc;
};
