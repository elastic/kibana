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
        type: 'date',
        format: 'yyyy-MM-dd HHmm'
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
    }
  };
}
