export default panel => error => {
  if (error.isBoom && error.status === 401) throw error;
  const result = {};
  let errorResponse;
  try {
    errorResponse = JSON.parse(error.response);
  } catch (e) {
    errorResponse = error.response;
  }
  if (!errorResponse) {
    errorResponse = {
      message: error.message,
      stack: error.stack
    };
  }
  result[panel.id] = {
    id: panel.id,
    statusCode: error.statusCode,
    error: errorResponse,
    series: []
  };
  return result;
};
