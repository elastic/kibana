angular.module('kibana.map', [])
.controller('map', function($scope, eventBus) {

  var _id = _.uniqueId();

  // Set and populate defaults
  var _d = {
    query   : "*",
    map     : "world",
    colors  : ['#C8EEFF', '#0071A4'],
    size    : 100,
    exclude : [],
    group   : "default",
  }
  _.defaults($scope.panel,_d)

  $scope.init = function() {
    eventBus.register($scope,'time', function(event,time){set_time(time)});
    eventBus.register($scope,'query', function(event, query) {
      $scope.panel.query = query;
      $scope.get_data();
    });
    // Now that we're all setup, request the time from our group
    eventBus.broadcast($scope.$id,$scope.panel.group,'get_time')
  }

  $scope.get_data = function() {
    // Make sure we have everything for the request to complete
    if(_.isUndefined($scope.panel.index) || _.isUndefined($scope.time))
      return

    var request = $scope.ejs.Request().indices($scope.panel.index);

    // Then the insert into facet and make the request
    var results = request
      .facet(ejs.TermsFacet('map')
        .field($scope.panel.field)
        .size($scope.panel['size'])
        .exclude($scope.panel.exclude)
        .facetFilter(ejs.QueryFilter(
          ejs.FilteredQuery(
            ejs.QueryStringQuery($scope.panel.query || '*'),
            ejs.RangeFilter(config.timefield)
              .from($scope.time.from)
              .to($scope.time.to)
            )))).size(0)
      .doSearch();

    // Populate scope when we have results
    results.then(function(results) {
      $scope.hits = results.hits.total;
      $scope.data = {};
      _.each(results.facets.map.terms, function(v) {
          if(!(_.isUndefined(countryName[index]))){
            $scope.data[countryName[index]] = v.count;
          }else{
            $scope.data[index] = v.count;
          }
      });
      $scope.$emit('render')
    });
  }

  function set_time(time) {
    $scope.time = time;
    $scope.panel.index = _.isUndefined(time.index) ? $scope.panel.index : time.index
    $scope.get_data();
  }

  $scope.init()

})
.directive('map', function() {
  return {
    restrict: 'A',
    link: function(scope, elem, attrs) {

      // Receive render events
      scope.$on('render',function(){
        render_panel();
      });

      // Or if the window is resized
      angular.element(window).bind('resize', function(){
        render_panel();
      });

      function render_panel() {
        // Using LABjs, wait until all scripts are loaded before rendering panel
        var scripts = $LAB.script("panels/map/lib/jquery.jvectormap.min.js")
          .script("panels/map/lib/map."+scope.panel.map+".js")
                    
        // Populate element. Note that jvectormap appends, does not replace.
        scripts.wait(function(){
          elem.text('');
          $('.jvectormap-zoomin,.jvectormap-zoomout,.jvectormap-label').remove();
          var map = elem.vectorMap({  
            map: scope.panel.map,
            regionStyle: {initial: {fill: '#ddd'}},
            zoomOnScroll: false,
            backgroundColor: '#fff',
            series: {
              regions: [{
                values: scope.data,
                scale: scope.panel.colors,
                normalizeFunction: 'polynomial'
              }]
            },
            onRegionLabelShow: function(event, label, code){
              $('.jvectormap-label').css({
                "position"    : "absolute",
                "display"     : "none",
                "border"      : "solid 1px #CDCDCD",
                "background"  : "#292929",
                "color"       : "white",
                "font-family" : "sans-serif, Verdana",
                "font-size"   : "smaller",
                "padding"     : "3px"
              })
              var count = _.isUndefined(scope.data[code]) ? 0 : scope.data[code];
              $('.jvectormap-label').text(label.text() + ": " + count);
            },
            onRegionOut: function(event, code) {
            }
          });
        })
      }
    }
  };
});

var countryName = {}
countryName['AFGHANISTAN']='AF'
countryName['ALAND ISLANDS']='AX'
countryName['ALBANIA']='AL'
countryName['ALGERIA']='DZ'
countryName['AMERICAN SAMOA']='AS'
countryName['ANDORRA']='AD'
countryName['ANGOLA']='AO'
countryName['ANGUILLA']='AI'
countryName['ANTARCTICA']='AQ'
countryName['ANTIGUA AND BARBUDA']='AG'
countryName['ARGENTINA']='AR'
countryName['ARMENIA']='AM'
countryName['ARUBA']='AW'
countryName['AUSTRALIA']='AU'
countryName['AUSTRIA']='AT'
countryName['AZERBAIJAN']='AZ'
countryName['BAHAMAS']='BS'
countryName['BAHRAIN']='BH'
countryName['BANGLADESH']='BD'
countryName['BARBADOS']='BB'
countryName['BELARUS']='BY'
countryName['BELGIUM']='BE'
countryName['BELIZE']='BZ'
countryName['BENIN']='BJ'
countryName['BERMUDA']='BM'
countryName['BHUTAN']='BT'
countryName['BOLIVIA, PLURINATIONAL STATE OF']='BO'
countryName['BONAIRE, SINT EUSTATIUS AND SABA']='BQ'
countryName['BOSNIA AND HERZEGOVINA']='BA'
countryName['BOTSWANA']='BW'
countryName['BOUVET ISLAND']='BV'
countryName['BRAZIL']='BR'
countryName['BRITISH INDIAN OCEAN TERRITORY']='IO'
countryName['BRUNEI DARUSSALAM']='BN'
countryName['BULGARIA']='BG'
countryName['BURKINA FASO']='BF'
countryName['BURUNDI']='BI'
countryName['CAMBODIA']='KH'
countryName['CAMEROON']='CM'
countryName['CANADA']='CA'
countryName['CAPE VERDE']='CV'
countryName['CAYMAN ISLANDS']='KY'
countryName['CENTRAL AFRICAN REPUBLIC']='CF'
countryName['CHAD']='TD'
countryName['CHILE']='CL'
countryName['CHINA']='CN'
countryName['CHRISTMAS ISLAND']='CX'
countryName['COCOS (KEELING) ISLANDS']='CC'
countryName['COLOMBIA']='CO'
countryName['COMOROS']='KM'
countryName['CONGO']='CG'
countryName['CONGO, THE DEMOCRATIC REPUBLIC OF THE']='CD'
countryName['COOK ISLANDS']='CK'
countryName['COSTA RICA']='CR'
countryName['COTE D\'IVOIRE']='CI'
countryName['CROATIA']='HR'
countryName['CUBA']='CU'
countryName['CURACAO']='CW'
countryName['CYPRUS']='CY'
countryName['CZECH REPUBLIC']='CZ'
countryName['DENMARK']='DK'
countryName['DJIBOUTI']='DJ'
countryName['DOMINICA']='DM'
countryName['DOMINICAN REPUBLIC']='DO'
countryName['ECUADOR']='EC'
countryName['EGYPT']='EG'
countryName['EL SALVADOR']='SV'
countryName['EQUATORIAL GUINEA']='GQ'
countryName['ERITREA']='ER'
countryName['ESTONIA']='EE'
countryName['ETHIOPIA']='ET'
countryName['FALKLAND ISLANDS (MALVINAS)']='FK'
countryName['FAROE ISLANDS']='FO'
countryName['FIJI']='FJ'
countryName['FINLAND']='FI'
countryName['FRANCE']='FR'
countryName['FRENCH GUIANA']='GF'
countryName['FRENCH POLYNESIA']='PF'
countryName['FRENCH SOUTHERN TERRITORIES']='TF'
countryName['GABON']='GA'
countryName['GAMBIA']='GM'
countryName['GEORGIA']='GE'
countryName['GERMANY']='DE'
countryName['GHANA']='GH'
countryName['GIBRALTAR']='GI'
countryName['GREECE']='GR'
countryName['GREENLAND']='GL'
countryName['GRENADA']='GD'
countryName['GUADELOUPE']='GP'
countryName['GUAM']='GU'
countryName['GUATEMALA']='GT'
countryName['GUERNSEY']='GG'
countryName['GUINEA']='GN'
countryName['GUINEA-BISSAU']='GW'
countryName['GUYANA']='GY'
countryName['HAITI']='HT'
countryName['HEARD ISLAND AND MCDONALD ISLANDS']='HM'
countryName['HOLY SEE (VATICAN CITY STATE)']='VA'
countryName['HONDURAS']='HN'
countryName['HONG KONG']='HK'
countryName['HUNGARY']='HU'
countryName['ICELAND']='IS'
countryName['INDIA']='IN'
countryName['INDONESIA']='ID'
countryName['IRAN, ISLAMIC REPUBLIC OF']='IR'
countryName['IRAQ']='IQ'
countryName['IRELAND']='IE'
countryName['ISLE OF MAN']='IM'
countryName['ISRAEL']='IL'
countryName['ITALY']='IT'
countryName['JAMAICA']='JM'
countryName['JAPAN']='JP'
countryName['JERSEY']='JE'
countryName['JORDAN']='JO'
countryName['KAZAKHSTAN']='KZ'
countryName['KENYA']='KE'
countryName['KIRIBATI']='KI'
countryName['KOREA, DEMOCRATIC PEOPLE\'S REPUBLIC OF']='KP'
countryName['KOREA, REPUBLIC OF']='KR'
countryName['KUWAIT']='KW'
countryName['KYRGYZSTAN']='KG'
countryName['LAO PEOPLE\'S DEMOCRATIC REPUBLIC']='LA'
countryName['LATVIA']='LV'
countryName['LEBANON']='LB'
countryName['LESOTHO']='LS'
countryName['LIBERIA']='LR'
countryName['LIBYAN ARAB JAMAHIRIYA']='LY'
countryName['LIECHTENSTEIN']='LI'
countryName['LITHUANIA']='LT'
countryName['LUXEMBOURG']='LU'
countryName['MACAO']='MO'
countryName['MACEDONIA, THE FORMER YUGOSLAV REPUBLIC OF']='MK'
countryName['MADAGASCAR']='MG'
countryName['MALAWI']='MW'
countryName['MALAYSIA']='MY'
countryName['MALDIVES']='MV'
countryName['MALI']='ML'
countryName['MALTA']='MT'
countryName['MARSHALL ISLANDS']='MH'
countryName['MARTINIQUE']='MQ'
countryName['MAURITANIA']='MR'
countryName['MAURITIUS']='MU'
countryName['MAYOTTE']='YT'
countryName['MEXICO']='MX'
countryName['MICRONESIA, FEDERATED STATES OF']='FM'
countryName['MOLDOVA, REPUBLIC OF']='MD'
countryName['MONACO']='MC'
countryName['MONGOLIA']='MN'
countryName['MONTENEGRO']='ME'
countryName['MONTSERRAT']='MS'
countryName['MOROCCO']='MA'
countryName['MOZAMBIQUE']='MZ'
countryName['MYANMAR']='MM'
countryName['NAMIBIA']='NA'
countryName['NAURU']='NR'
countryName['NEPAL']='NP'
countryName['NETHERLANDS']='NL'
countryName['NEW CALEDONIA']='NC'
countryName['NEW ZEALAND']='NZ'
countryName['NICARAGUA']='NI'
countryName['NIGER']='NE'
countryName['NIGERIA']='NG'
countryName['NIUE']='NU'
countryName['NORFOLK ISLAND']='NF'
countryName['NORTHERN MARIANA ISLANDS']='MP'
countryName['NORWAY']='NO'
countryName['OCCUPIED PALESTINIAN TERRITORY']='PS'
countryName['OMAN']='OM'
countryName['PAKISTAN']='PK'
countryName['PALAU']='PW'
countryName['PANAMA']='PA'
countryName['PAPUA NEW GUINEA']='PG'
countryName['PARAGUAY']='PY'
countryName['PERU']='PE'
countryName['PHILIPPINES']='PH'
countryName['PITCAIRN']='PN'
countryName['POLAND']='PL'
countryName['PORTUGAL']='PT'
countryName['PUERTO RICO']='PR'
countryName['QATAR']='QA'
countryName['REUNION']='RE'
countryName['ROMANIA']='RO'
countryName['RUSSIAN FEDERATION']='RU'
countryName['RWANDA']='RW'
countryName['SAINT BARTHELEMY']='BL'
countryName['SAINT HELENA, ASCENSION AND TRISTAN DA CUNHA']='SH'
countryName['SAINT KITTS AND NEVIS']='KN'
countryName['SAINT LUCIA']='LC'
countryName['SAINT MARTIN (FRENCH PART)']='MF'
countryName['SAINT PIERRE AND MIQUELON']='PM'
countryName['SAINT VINCENT AND THE GRENADINES']='VC'
countryName['SAMOA']='WS'
countryName['SAN MARINO']='SM'
countryName['SAO TOME AND PRINCIPE']='ST'
countryName['SAUDI ARABIA']='SA'
countryName['SENEGAL']='SN'
countryName['SERBIA']='RS'
countryName['SEYCHELLES']='SC'
countryName['SIERRA LEONE']='SL'
countryName['SINGAPORE']='SG'
countryName['SINT MAARTEN (DUTCH PART)']='SX'
countryName['SLOVAKIA']='SK'
countryName['SLOVENIA']='SI'
countryName['SOLOMON ISLANDS']='SB'
countryName['SOMALIA']='SO'
countryName['SOUTH AFRICA']='ZA'
countryName['SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS']='GS'
countryName['SOUTH SUDAN']='SS'
countryName['SPAIN']='ES'
countryName['SRI LANKA']='LK'
countryName['SUDAN']='SD'
countryName['SURINAME']='SR'
countryName['SVALBARD AND JAN MAYEN']='SJ'
countryName['SWAZILAND']='SZ'
countryName['SWEDEN']='SE'
countryName['SWITZERLAND']='CH'
countryName['SYRIAN ARAB REPUBLIC']='SY'
countryName['TAIWAN, PROVINCE OF CHINA']='TW'
countryName['TAJIKISTAN']='TJ'
countryName['TANZANIA, UNITED REPUBLIC OF']='TZ'
countryName['THAILAND']='TH'
countryName['TIMOR-LESTE']='TL'
countryName['TOGO']='TG'
countryName['TOKELAU']='TK'
countryName['TONGA']='TO'
countryName['TRINIDAD AND TOBAGO']='TT'
countryName['TUNISIA']='TN'
countryName['TURKEY']='TR'
countryName['TURKMENISTAN']='TM'
countryName['TURKS AND CAICOS ISLANDS']='TC'
countryName['TUVALU']='TV'
countryName['UGANDA']='UG'
countryName['UKRAINE']='UA'
countryName['UNITED ARAB EMIRATES']='AE'
countryName['UNITED KINGDOM']='GB'
countryName['UNITED STATES']='US'
countryName['UNITED STATES MINOR OUTLYING ISLANDS']='UM'
countryName['URUGUAY']='UY'
countryName['UZBEKISTAN']='UZ'
countryName['VANUATU']='VU'
countryName['VENEZUELA, BOLIVARIAN REPUBLIC OF']='VE'
countryName['VIET NAM']='VN'
countryName['VIRGIN ISLANDS, BRITISH']='VG'
countryName['VIRGIN ISLANDS, U.S.']='VI'
countryName['WALLIS AND FUTUNA']='WF'
countryName['WESTERN SAHARA']='EH'
countryName['YEMEN']='YE'
countryName['ZAMBIA']='ZM'
countryName['ZIMBABWE']='ZW'
