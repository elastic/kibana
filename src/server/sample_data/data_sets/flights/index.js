import { savedObjects } from './saved_objects';

export function flightsSpecProvider() {
  return {
    id: 'flights',
    name: 'Flights',
    description: 'Fictional flight data.',
    dataPath: './sample_data/flights.json',
    fields: {
      timestamp: {
        type: 'date'
      },
      dayOfWeek: {
        type: 'integer'
      },
      Carrier: {
        type: 'keyword'
      },
      FlightNum: {
        type: 'keyword'
      },
      Origin: {
        type: 'keyword'
      },
      OriginAirportID: {
        type: 'keyword'
      },
      OriginCityName: {
        type: 'keyword'
      },
      OriginRegion: {
        type: 'keyword'
      },
      OriginCountry: {
        type: 'keyword'
      },
      OriginLocation: {
        type: 'geo_point'
      },
      Dest: {
        type: 'keyword'
      },
      DestAirportID: {
        type: 'keyword'
      },
      DestCityName: {
        type: 'keyword'
      },
      DestRegion: {
        type: 'keyword'
      },
      DestCountry: {
        type: 'keyword'
      },
      DestLocation: {
        type: 'geo_point'
      },
      AvgTicketPrice: {
        type: 'float'
      },
      OriginWeather: {
        type: 'keyword'
      },
      DestWeather: {
        type: 'keyword'
      },
      Cancelled: {
        type: 'boolean'
      },
      DistanceMiles: {
        type: 'float'
      },
      DistanceKilometers: {
        type: 'float'
      },
      FlightDelayMin: {
        type: 'integer'
      },
      FlightDelay: {
        type: 'boolean'
      },
      FlightDelayType: {
        type: 'keyword'
      },
      FlightTimeMin: {
        type: 'float'
      },
      FlightTimeHour: {
        type: 'keyword'
      }
    },
    timeFields: ['timestamp'],
    currentTimeMarker: '2018-01-02T00:00:00Z',
    preserveDayOfWeekTimeOfDay: true,
    savedObjects: savedObjects,
  };
}
