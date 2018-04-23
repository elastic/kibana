export function flightsSpecProvider() {
  return {
    id: 'flights',
    name: 'Flights',
    description: 'Fictional flight data.',
    dataPath: './sample_data/flights.json',
    fields: {
      airline: {
        type: 'keyword'
      },
      timestamp: {
        type: 'date'
      },
      dest: {
        type: 'keyword'
      },
      origin: {
        type: 'keyword'
      },
      tailNum: {
        type: 'keyword'
      }
    },
    timeFields: ['timestamp'],
    currentTimeMarker: '2018-01-02T00:00:00Z',
    preserveDayOfWeekTimeOfDay: true,
  };
}
