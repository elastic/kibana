import { SavedObjectsClient } from '../saved_objects/client';

export async function getStats(kibanaIndex, request, callWithRequest) {
  const savedObjectsClient = new SavedObjectsClient(kibanaIndex, request, callWithRequest);
  const dashResponse = await savedObjectsClient.find({ type: 'dashboard', perPage: 0 });
  const visResponse = await savedObjectsClient.find({ type: 'visualization', perPage: 0 });

  return {
    dashboardCount: dashResponse.total,
    visualizationCount: visResponse.total,
  };
}
