import { CoreSetup, IRouter } from '../../../../src/core/server';
import { schema } from '@kbn/config-schema';

export function defineRoutes(router: IRouter, core: CoreSetup) {
  router.post(
    {
      path: '/api/dashboard_generator/generate',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const [coreStart] = await core.getStartServices();
      const soClient = coreStart.savedObjects.getScopedClient(request);
      await soClient.create(
        'dashboard',
        {
          controlGroupInput: {
            controlStyle: 'oneLine',
            chainingSystem: 'HIERARCHICAL',
            showApplySelections: false,
            ignoreParentSettingsJSON:
              '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
            panelsJSON:
              '{"dceffdb2-51f6-4ea6-af9e-934473e16a71":{"order":0,"width":"medium","grow":true,"type":"optionsListControl","explicitInput":{"fieldName":"host.hostname","title":"Nginx instance","singleSelect":true,"id":"dceffdb2-51f6-4ea6-af9e-934473e16a71","enhancements":{}}}}',
          },
          description: 'Dashboard for the Logs Nginx integration',
          hits: 0,
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"filter":[],"highlightAll":true,"query":{"language":"kuery","query":""},"version":true}',
          },
          optionsJSON:
            '{"darkTheme":false,"hidePanelTitles":false,"syncColors":false,"useMargins":true}',
          panelsJSON: `[{"embeddableConfig":{"enhancements":{}},"gridData":{"h":5,"i":"17","w":48,"x":0,"y":0},"panelIndex":"17","panelRefName":"panel_17","type":"visualization","version":"8.5.0"},{"embeddableConfig":{"enhancements":{},"hiddenLayers":[],"isLayerTOCOpen":false,"mapBuffer":{"maxLat":66.51326,"maxLon":180,"minLat":-66.51326,"minLon":-180},"mapCenter":{"lat":20.04926,"lon":-0.18698,"zoom":1.57},"openTOCDetails":[]},"gridData":{"h":15,"i":"21145e70-412c-4fdf-91f8-f8950bb126dd","w":48,"x":0,"y":5},"panelIndex":"21145e70-412c-4fdf-91f8-f8950bb126dd","panelRefName":"panel_21145e70-412c-4fdf-91f8-f8950bb126dd","type":"map","version":"8.5.0"},{"version":"8.9.0","type":"lens","gridData":{"h":12,"i":"1e31e4b9-c6e8-4fbe-b998-8f367cb5002e","w":48,"x":0,"y":20},"panelIndex":"1e31e4b9-c6e8-4fbe-b998-8f367cb5002e","embeddableConfig":{"attributes":{"references":[{"id":"logs-*","name":"indexpattern-datasource-layer-26f293c7-fd97-4077-9f33-69996b16581c","type":"index-pattern"}],"state":{"adHocDataViews":{},"datasourceStates":{"formBased":{"layers":{"26f293c7-fd97-4077-9f33-69996b16581c":{"columnOrder":["5f169cdd-5154-4912-8176-7ab93f766551","6fbb212e-fc27-49a3-adae-aa5f335e7ede","338bf82d-253c-4ab1-9f12-b2edc5d94f5f"],"columns":{"338bf82d-253c-4ab1-9f12-b2edc5d94f5f":{"customLabel":false,"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","params":{"emptyAsNull":true,"format":{"id":"number","params":{"decimals":0}}},"scale":"ratio","sourceField":"___records___"},"5f169cdd-5154-4912-8176-7ab93f766551":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"dropPartials":true,"includeEmptyRows":true,"interval":"auto"},"scale":"interval","sourceField":"@timestamp"},"6fbb212e-fc27-49a3-adae-aa5f335e7ede":{"dataType":"string","isBucketed":true,"label":"Filters","operationType":"filters","params":{"filters":[{"input":{"language":"kuery","query":"http.response.status_code >= 200 and http.response.status_code <= 299"},"label":"200s"},{"input":{"language":"kuery","query":"http.response.status_code >= 300 and http.response.status_code <= 399"},"label":"300s"},{"input":{"language":"kuery","query":"http.response.status_code >= 400 and http.response.status_code <= 499"},"label":"400s"},{"input":{"language":"kuery","query":"http.response.status_code >= 500 and http.response.status_code <= 599"},"label":"500s"}]},"scale":"ordinal"}},"incompleteColumns":{}}}}},"filters":[],"internalReferences":[],"query":{"language":"kuery","query":"data_stream.dataset:nginx.access"},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":false,"yRight":true},"layers":[{"accessors":["338bf82d-253c-4ab1-9f12-b2edc5d94f5f"],"layerId":"26f293c7-fd97-4077-9f33-69996b16581c","layerType":"data","palette":{"name":"status","type":"palette"},"position":"top","seriesType":"bar_stacked","showGridlines":false,"splitAccessor":"6fbb212e-fc27-49a3-adae-aa5f335e7ede","xAccessor":"5f169cdd-5154-4912-8176-7ab93f766551"}],"legend":{"isVisible":true,"position":"bottom","showSingleSeries":true},"preferredSeriesType":"bar_stacked","title":"Empty XY chart","valueLabels":"hide","valuesInLegend":true,"yTitle":""}},"title":"","type":"lens","visualizationType":"lnsXY"},"enhancements":{},"type":"lens"},"title":"Response codes over time [Logs Nginx]"},{"version":"8.9.0","type":"lens","gridData":{"h":12,"i":"825480d3-c664-4605-905d-bac3e5249620","w":24,"x":0,"y":32},"panelIndex":"825480d3-c664-4605-905d-bac3e5249620","embeddableConfig":{"attributes":{"references":[{"id":"logs-*","name":"indexpattern-datasource-layer-f4ff081d-fdd1-4c3e-980c-d64585cb4574","type":"index-pattern"}],"state":{"adHocDataViews":{},"datasourceStates":{"formBased":{"layers":{"f4ff081d-fdd1-4c3e-980c-d64585cb4574":{"columnOrder":["e012f19a-e3be-4d80-9f0e-bb798fd6a287","bbdd586c-2e58-4eef-ab51-934d92709000","2063aa66-e5e8-4634-a3fe-1b0ebb8f219c"],"columns":{"2063aa66-e5e8-4634-a3fe-1b0ebb8f219c":{"customLabel":false,"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","params":{"emptyAsNull":true,"format":{"id":"number","params":{"decimals":0,"suffi":""}}},"scale":"ratio","sourceField":"___records___"},"bbdd586c-2e58-4eef-ab51-934d92709000":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"dropPartials":true,"includeEmptyRows":true,"interval":"auto"},"scale":"interval","sourceField":"@timestamp"},"e012f19a-e3be-4d80-9f0e-bb798fd6a287":{"dataType":"string","isBucketed":true,"label":"Top 10 values of log.level","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"2063aa66-e5e8-4634-a3fe-1b0ebb8f219c","type":"column"},"orderDirection":"desc","otherBucket":false,"parentFormat":{"id":"terms"},"size":10},"scale":"ordinal","sourceField":"log.level"}},"incompleteColumns":{}}}}},"filters":[],"internalReferences":[],"query":{"language":"kuery","query":"data_stream.dataset:nginx.error"},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":false,"yRight":true},"layers":[{"accessors":["2063aa66-e5e8-4634-a3fe-1b0ebb8f219c"],"layerId":"f4ff081d-fdd1-4c3e-980c-d64585cb4574","layerType":"data","palette":{"name":"negative","type":"palette"},"position":"top","seriesType":"bar","showGridlines":false,"splitAccessor":"e012f19a-e3be-4d80-9f0e-bb798fd6a287","xAccessor":"bbdd586c-2e58-4eef-ab51-934d92709000","yConfig":[{"axisMode":"left","forAccessor":"2063aa66-e5e8-4634-a3fe-1b0ebb8f219c"}]}],"legend":{"isVisible":true,"position":"bottom","showSingleSeries":true},"preferredSeriesType":"bar","title":"Empty XY chart","valueLabels":"hide","valuesInLegend":true,"yTitle":""}},"title":"","type":"lens","visualizationType":"lnsXY"},"enhancements":{},"type":"lens"},"title":"Errors over time [Logs Nginx]"},{"version":"8.9.0","type":"lens","gridData":{"h":12,"i":"5da0394b-33bf-45ab-abf5-1520f02d631b","w":24,"x":24,"y":32},"panelIndex":"5da0394b-33bf-45ab-abf5-1520f02d631b","embeddableConfig":{"attributes":{"references":[{"id":"logs-*","name":"indexpattern-datasource-layer-0b2b4996-5ac9-4fb2-9608-87337114447c","type":"index-pattern"}],"state":{"adHocDataViews":{},"datasourceStates":{"formBased":{"layers":{"0b2b4996-5ac9-4fb2-9608-87337114447c":{"columnOrder":["ef705b1d-2e71-4664-af8e-556018344bc4","5802e96b-7129-4696-b5a3-96cec2b2cc7f"],"columns":{"5802e96b-7129-4696-b5a3-96cec2b2cc7f":{"customLabel":false,"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","params":{"emptyAsNull":true},"scale":"ratio","sourceField":"___records___"},"ef705b1d-2e71-4664-af8e-556018344bc4":{"dataType":"string","isBucketed":true,"label":"Top 10 values of url.original","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"5802e96b-7129-4696-b5a3-96cec2b2cc7f","type":"column"},"orderDirection":"desc","otherBucket":false,"parentFormat":{"id":"terms"},"size":10},"scale":"ordinal","sourceField":"url.original"}},"incompleteColumns":{}}}}},"filters":[],"internalReferences":[],"query":{"language":"kuery","query":"data_stream.dataset:nginx.access"},"visualization":{"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"gridlinesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"layers":[{"accessors":["5802e96b-7129-4696-b5a3-96cec2b2cc7f"],"layerId":"0b2b4996-5ac9-4fb2-9608-87337114447c","layerType":"data","position":"top","seriesType":"bar_horizontal","showGridlines":false,"xAccessor":"ef705b1d-2e71-4664-af8e-556018344bc4","yConfig":[{"axisMode":"left","color":"#68bc00","forAccessor":"5802e96b-7129-4696-b5a3-96cec2b2cc7f"}]}],"legend":{"isVisible":true,"position":"right","showSingleSeries":true},"preferredSeriesType":"bar_horizontal","tickLabelsVisibilitySettings":{"x":true,"yLeft":false,"yRight":true},"title":"Empty XY chart","valueLabels":"show","xTitle":"","yTitle":""}},"title":"","type":"lens","visualizationType":"lnsXY"},"enhancements":{},"hidePanelTitles":false,"type":"lens"},"title":"Top pages [Logs Nginx]"},{"version":"8.9.0","type":"lens","gridData":{"h":12,"i":"21441c88-a43c-4ebf-8a32-da05f9c09d67","w":24,"x":0,"y":44},"panelIndex":"21441c88-a43c-4ebf-8a32-da05f9c09d67","embeddableConfig":{"attributes":{"references":[{"id":"logs-*","name":"indexpattern-datasource-layer-af1b0284-d308-40fc-ab5e-f4c56b3fbe18","type":"index-pattern"}],"state":{"adHocDataViews":{},"datasourceStates":{"formBased":{"layers":{"af1b0284-d308-40fc-ab5e-f4c56b3fbe18":{"columnOrder":["181b67a0-93bd-4e05-b639-f6492bb6a324","2c88150f-771b-4d56-b3ce-a559fd47750a"],"columns":{"181b67a0-93bd-4e05-b639-f6492bb6a324":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"dropPartials":true,"includeEmptyRows":true,"interval":"auto"},"scale":"interval","sourceField":"@timestamp"},"2c88150f-771b-4d56-b3ce-a559fd47750a":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"HTTP response body","operationType":"sum","params":{"emptyAsNull":true,"format":{"id":"bytes","params":{"decimals":2}}},"scale":"ratio","sourceField":"http.response.body.bytes"}},"incompleteColumns":{}}}}},"filters":[],"internalReferences":[],"query":{"language":"kuery","query":"data_stream.dataset:nginx.access"},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":false,"yRight":true},"emphasizeFitting":true,"fittingFunction":"Zero","layers":[{"accessors":["2c88150f-771b-4d56-b3ce-a559fd47750a"],"layerId":"af1b0284-d308-40fc-ab5e-f4c56b3fbe18","layerType":"data","position":"top","seriesType":"line","showGridlines":false,"xAccessor":"181b67a0-93bd-4e05-b639-f6492bb6a324","yConfig":[{"axisMode":"left","color":"#68bc00","forAccessor":"2c88150f-771b-4d56-b3ce-a559fd47750a"}]}],"legend":{"isVisible":true,"position":"bottom","showSingleSeries":true},"preferredSeriesType":"line","title":"Empty XY chart","valueLabels":"hide","valuesInLegend":true,"yTitle":""}},"title":"","type":"lens","visualizationType":"lnsXY"},"enhancements":{},"type":"lens"},"title":"Data Volume [Logs Nginx]"},{"version":"8.9.0","type":"lens","gridData":{"h":12,"i":"d14bb06d-310e-4e43-99dd-8b83c4af776f","w":12,"x":36,"y":44},"panelIndex":"d14bb06d-310e-4e43-99dd-8b83c4af776f","embeddableConfig":{"attributes":{"references":[{"id":"logs-*","name":"indexpattern-datasource-layer-e52ce143-94b8-4b0d-996c-ff71ded2647d","type":"index-pattern"}],"state":{"adHocDataViews":{},"datasourceStates":{"formBased":{"layers":{"e52ce143-94b8-4b0d-996c-ff71ded2647d":{"columnOrder":["af2711f0-7714-4291-b405-e4413bf099d7","4bdd1170-9e37-477f-86f3-06a403a558a0","1bdd5139-0732-45d4-92c0-c075822ddd3c"],"columns":{"1bdd5139-0732-45d4-92c0-c075822ddd3c":{"customLabel":false,"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","params":{"emptyAsNull":true},"scale":"ratio","sourceField":"___records___"},"4bdd1170-9e37-477f-86f3-06a403a558a0":{"dataType":"string","isBucketed":true,"label":"Top 5 values of user_agent.version","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"1bdd5139-0732-45d4-92c0-c075822ddd3c","type":"column"},"orderDirection":"desc","otherBucket":false,"parentFormat":{"id":"terms"},"size":5},"scale":"ordinal","sourceField":"user_agent.version"},"af2711f0-7714-4291-b405-e4413bf099d7":{"dataType":"string","isBucketed":true,"label":"Top 5 values of user_agent.name","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"1bdd5139-0732-45d4-92c0-c075822ddd3c","type":"column"},"orderDirection":"desc","otherBucket":false,"parentFormat":{"id":"terms"},"size":5},"scale":"ordinal","sourceField":"user_agent.name"}},"incompleteColumns":{}}}}},"filters":[],"internalReferences":[],"query":{"language":"kuery","query":""},"visualization":{"layers":[{"categoryDisplay":"default","layerId":"e52ce143-94b8-4b0d-996c-ff71ded2647d","layerType":"data","legendDisplay":"show","legendPosition":"right","nestedLegend":false,"numberDisplay":"percent","primaryGroups":["af2711f0-7714-4291-b405-e4413bf099d7","4bdd1170-9e37-477f-86f3-06a403a558a0"],"metrics":["1bdd5139-0732-45d4-92c0-c075822ddd3c"]}],"palette":{"name":"kibana_palette","type":"palette"},"shape":"donut"}},"title":"","type":"lens","visualizationType":"lnsPie"},"enhancements":{},"type":"lens"},"title":"Browsers breakdown [Logs Nginx]"},{"version":"8.9.0","type":"lens","gridData":{"h":12,"i":"4d441323-04d2-48a1-af30-7a42670bb86a","w":12,"x":24,"y":44},"panelIndex":"4d441323-04d2-48a1-af30-7a42670bb86a","embeddableConfig":{"attributes":{"references":[{"id":"logs-*","name":"indexpattern-datasource-layer-9c5e72e7-b4c5-4892-906d-e3725123b919","type":"index-pattern"}],"state":{"adHocDataViews":{},"datasourceStates":{"formBased":{"layers":{"9c5e72e7-b4c5-4892-906d-e3725123b919":{"columnOrder":["d6f1e7b7-2851-4d26-a8b7-d68f21fd67ed","5911e370-9a49-4d0f-b179-3f38c91562b3","a30fd50b-848a-447d-bb91-e2c73436fd55"],"columns":{"5911e370-9a49-4d0f-b179-3f38c91562b3":{"dataType":"string","isBucketed":true,"label":"Top 5 values of user_agent.os.version","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"a30fd50b-848a-447d-bb91-e2c73436fd55","type":"column"},"orderDirection":"desc","otherBucket":false,"parentFormat":{"id":"terms"},"size":5},"scale":"ordinal","sourceField":"user_agent.os.version"},"a30fd50b-848a-447d-bb91-e2c73436fd55":{"customLabel":false,"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","params":{"emptyAsNull":true},"scale":"ratio","sourceField":"___records___"},"d6f1e7b7-2851-4d26-a8b7-d68f21fd67ed":{"dataType":"string","isBucketed":true,"label":"Top 5 values of user_agent.os.name","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"a30fd50b-848a-447d-bb91-e2c73436fd55","type":"column"},"orderDirection":"desc","otherBucket":false,"parentFormat":{"id":"terms"},"size":5},"scale":"ordinal","sourceField":"user_agent.os.name"}},"incompleteColumns":{}}}}},"filters":[],"internalReferences":[],"query":{"language":"kuery","query":""},"visualization":{"layers":[{"categoryDisplay":"hide","layerId":"9c5e72e7-b4c5-4892-906d-e3725123b919","layerType":"data","legendDisplay":"show","legendPosition":"right","nestedLegend":false,"numberDisplay":"percent","primaryGroups":["d6f1e7b7-2851-4d26-a8b7-d68f21fd67ed","5911e370-9a49-4d0f-b179-3f38c91562b3"],"truncateLegend":true,"metrics":["a30fd50b-848a-447d-bb91-e2c73436fd55"]}],"palette":{"name":"kibana_palette","type":"palette"},"shape":"donut"}},"title":"","type":"lens","visualizationType":"lnsPie"},"enhancements":{},"type":"lens"},"title":"Operating systems breakdown [Logs Nginx]"}]`,
          timeRestore: false,
          title: 'Generated dashboard',
          version: 1,
        },
        {
          references: [
            {
              id: 'nginx-97109780-a2a5-11e7-928f-5dbe6f6f5519',
              name: '17:panel_17',
              type: 'visualization',
            },
            {
              id: 'nginx-4576daa0-e1da-11ec-baf0-970634a1784d',
              name: '21145e70-412c-4fdf-91f8-f8950bb126dd:panel_21145e70-412c-4fdf-91f8-f8950bb126dd',
              type: 'map',
            },
            {
              id: 'logs-*',
              name: '1e31e4b9-c6e8-4fbe-b998-8f367cb5002e:indexpattern-datasource-layer-26f293c7-fd97-4077-9f33-69996b16581c',
              type: 'index-pattern',
            },
            {
              id: 'logs-*',
              name: '825480d3-c664-4605-905d-bac3e5249620:indexpattern-datasource-layer-f4ff081d-fdd1-4c3e-980c-d64585cb4574',
              type: 'index-pattern',
            },
            {
              id: 'logs-*',
              name: '5da0394b-33bf-45ab-abf5-1520f02d631b:indexpattern-datasource-layer-0b2b4996-5ac9-4fb2-9608-87337114447c',
              type: 'index-pattern',
            },
            {
              id: 'logs-*',
              name: '21441c88-a43c-4ebf-8a32-da05f9c09d67:indexpattern-datasource-layer-af1b0284-d308-40fc-ab5e-f4c56b3fbe18',
              type: 'index-pattern',
            },
            {
              id: 'logs-*',
              name: 'd14bb06d-310e-4e43-99dd-8b83c4af776f:indexpattern-datasource-layer-e52ce143-94b8-4b0d-996c-ff71ded2647d',
              type: 'index-pattern',
            },
            {
              id: 'logs-*',
              name: '4d441323-04d2-48a1-af30-7a42670bb86a:indexpattern-datasource-layer-9c5e72e7-b4c5-4892-906d-e3725123b919',
              type: 'index-pattern',
            },
            {
              id: 'logs-*',
              name: 'controlGroup_dceffdb2-51f6-4ea6-af9e-934473e16a71:optionsListDataView',
              type: 'index-pattern',
            },
          ],
        }
      );
      console.log(request.body);
      return response.ok({
        body: {
          time: new Date().toISOString(),
        },
      });
    }
  );
}
