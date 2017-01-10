export default {
  app: {}, // Kibana stuff in here
  transient: {
    editor: false,
  }, // Things that don't survive a refresh
  persistent: { // Stuff that should survive, and be serialized and saved
    workpad: {
      pages: [
        {
          id: 'foo',
          style: {
            backgroundColor: '#c66'
          },
          elements: [
            {
              id: '345263-f275g9w-43523-34-2524',
              type: 'json',
              height: 100,
              width: 200,
              top: 20,
              left: 30,
              props: {}
            },
            {
              id: '34785fh2-425-22-22524',
              type: 'table',
              height: 100,
              width: 100,
              top: 200,
              left: 200,
              props: {}
            }
          ],
        },
        {
          id: 'bar',
          style: {
            backgroundColor: '#6c6'
          },
          elements: [
            {
              id: '43859-34534252452-2345-34-2524',
              type: 'table',
              height: 100,
              width: 100,
              top: 300,
              left: 50,
              props: {}
            }
          ],
        }
      ],
      height: 600,
      width: 400,
      page: 0,
    },
    dataframes: {}
  },
};
