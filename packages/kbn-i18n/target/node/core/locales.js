"use strict";

var _intlMessageformat = _interopRequireDefault(require("intl-messageformat"));

var _intlRelativeformat = _interopRequireDefault(require("intl-relativeformat"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable */
// Copied from https://github.com/yahoo/intl-relativeformat/tree/master/dist/locale-data
function addLocaleData(localeData) {
  _intlMessageformat.default.__addLocaleData(localeData);

  _intlRelativeformat.default.__addLocaleData(localeData);
}

addLocaleData({
  locale: "en",
  pluralRuleFunction: function (n, ord) {
    var s = String(n).split("."),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
    if (ord) return n10 == 1 && n100 != 11 ? "one" : n10 == 2 && n100 != 12 ? "two" : n10 == 3 && n100 != 13 ? "few" : "other";
    return n == 1 && v0 ? "one" : "other";
  },
  "fields": {
    "year": {
      "displayName": "year",
      "relative": {
        "0": "this year",
        "1": "next year",
        "-1": "last year"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} year",
          "other": "in {0} years"
        },
        "past": {
          "one": "{0} year ago",
          "other": "{0} years ago"
        }
      }
    },
    "year-short": {
      "displayName": "yr.",
      "relative": {
        "0": "this yr.",
        "1": "next yr.",
        "-1": "last yr."
      },
      "relativeTime": {
        "future": {
          "one": "in {0} yr.",
          "other": "in {0} yr."
        },
        "past": {
          "one": "{0} yr. ago",
          "other": "{0} yr. ago"
        }
      }
    },
    "month": {
      "displayName": "month",
      "relative": {
        "0": "this month",
        "1": "next month",
        "-1": "last month"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} month",
          "other": "in {0} months"
        },
        "past": {
          "one": "{0} month ago",
          "other": "{0} months ago"
        }
      }
    },
    "month-short": {
      "displayName": "mo.",
      "relative": {
        "0": "this mo.",
        "1": "next mo.",
        "-1": "last mo."
      },
      "relativeTime": {
        "future": {
          "one": "in {0} mo.",
          "other": "in {0} mo."
        },
        "past": {
          "one": "{0} mo. ago",
          "other": "{0} mo. ago"
        }
      }
    },
    "day": {
      "displayName": "day",
      "relative": {
        "0": "today",
        "1": "tomorrow",
        "-1": "yesterday"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} day",
          "other": "in {0} days"
        },
        "past": {
          "one": "{0} day ago",
          "other": "{0} days ago"
        }
      }
    },
    "day-short": {
      "displayName": "day",
      "relative": {
        "0": "today",
        "1": "tomorrow",
        "-1": "yesterday"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} day",
          "other": "in {0} days"
        },
        "past": {
          "one": "{0} day ago",
          "other": "{0} days ago"
        }
      }
    },
    "hour": {
      "displayName": "hour",
      "relative": {
        "0": "this hour"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} hour",
          "other": "in {0} hours"
        },
        "past": {
          "one": "{0} hour ago",
          "other": "{0} hours ago"
        }
      }
    },
    "hour-short": {
      "displayName": "hr.",
      "relative": {
        "0": "this hour"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} hr.",
          "other": "in {0} hr."
        },
        "past": {
          "one": "{0} hr. ago",
          "other": "{0} hr. ago"
        }
      }
    },
    "minute": {
      "displayName": "minute",
      "relative": {
        "0": "this minute"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} minute",
          "other": "in {0} minutes"
        },
        "past": {
          "one": "{0} minute ago",
          "other": "{0} minutes ago"
        }
      }
    },
    "minute-short": {
      "displayName": "min.",
      "relative": {
        "0": "this minute"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} min.",
          "other": "in {0} min."
        },
        "past": {
          "one": "{0} min. ago",
          "other": "{0} min. ago"
        }
      }
    },
    "second": {
      "displayName": "second",
      "relative": {
        "0": "now"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} second",
          "other": "in {0} seconds"
        },
        "past": {
          "one": "{0} second ago",
          "other": "{0} seconds ago"
        }
      }
    },
    "second-short": {
      "displayName": "sec.",
      "relative": {
        "0": "now"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} sec.",
          "other": "in {0} sec."
        },
        "past": {
          "one": "{0} sec. ago",
          "other": "{0} sec. ago"
        }
      }
    }
  }
});
addLocaleData({
  locale: "en-US",
  parentLocale: "en"
});
addLocaleData({
  locale: "en-xa",
  pluralRuleFunction: function (n, ord) {
    var s = String(n).split("."),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
    if (ord) return n10 == 1 && n100 != 11 ? "one" : n10 == 2 && n100 != 12 ? "two" : n10 == 3 && n100 != 13 ? "few" : "other";
    return n == 1 && v0 ? "one" : "other";
  },
  "fields": {
    "year": {
      "displayName": "ýéààŕ",
      "relative": {
        "0": "ţĥîîš ýééàŕ",
        "1": "ñéẋẋţ ýééàŕ",
        "-1": "ļàššţ ýééàŕ"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ýýéàŕŕ",
          "other": "îñ {0} ýýéàŕŕš"
        },
        "past": {
          "one": "{0} ýéààŕ àĝĝô",
          "other": "{0} ýéààŕš ààĝô"
        }
      }
    },
    "year-short": {
      "displayName": "ýŕ.",
      "relative": {
        "0": "ţĥîîš ýŕŕ.",
        "1": "ñéẋẋţ ýŕŕ.",
        "-1": "ļàššţ ýŕŕ."
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ýýŕ.",
          "other": "îñ {0} ýýŕ."
        },
        "past": {
          "one": "{0} ýŕ. ààĝô",
          "other": "{0} ýŕ. ààĝô"
        }
      }
    },
    "month": {
      "displayName": "ɱôññţĥ",
      "relative": {
        "0": "ţĥîîš ɱôôñţĥĥ",
        "1": "ñéẋẋţ ɱôôñţĥĥ",
        "-1": "ļàššţ ɱôôñţĥĥ"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ɱɱôñţţĥ",
          "other": "îñ {0} ɱɱôñţţĥš"
        },
        "past": {
          "one": "{0} ɱôññţĥ ààĝô",
          "other": "{0} ɱôññţĥšš àĝôô"
        }
      }
    },
    "month-short": {
      "displayName": "ɱô.",
      "relative": {
        "0": "ţĥîîš ɱôô.",
        "1": "ñéẋẋţ ɱôô.",
        "-1": "ļàššţ ɱôô."
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ɱɱô.",
          "other": "îñ {0} ɱɱô."
        },
        "past": {
          "one": "{0} ɱô. ààĝô",
          "other": "{0} ɱô. ààĝô"
        }
      }
    },
    "day": {
      "displayName": "ðàýý",
      "relative": {
        "0": "ţôððàý",
        "1": "ţôɱɱôŕŕŕôŵ",
        "-1": "ýéššţéŕŕðàýý"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ððàý",
          "other": "îñ {0} ððàýšš"
        },
        "past": {
          "one": "{0} ðàýý àĝôô",
          "other": "{0} ðàýýš àĝĝô"
        }
      }
    },
    "day-short": {
      "displayName": "ðàýý",
      "relative": {
        "0": "ţôððàý",
        "1": "ţôɱɱôŕŕŕôŵ",
        "-1": "ýéššţéŕŕðàýý"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ððàý",
          "other": "îñ {0} ððàýšš"
        },
        "past": {
          "one": "{0} ðàýý àĝôô",
          "other": "{0} ðàýýš àĝĝô"
        }
      }
    },
    "hour": {
      "displayName": "ĥôûûŕ",
      "relative": {
        "0": "ţĥîîš ĥôôûŕ"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ĥĥôûŕŕ",
          "other": "îñ {0} ĥĥôûŕŕš"
        },
        "past": {
          "one": "{0} ĥôûûŕ àĝĝô",
          "other": "{0} ĥôûûŕš ààĝô"
        }
      }
    },
    "hour-short": {
      "displayName": "ĥŕ.",
      "relative": {
        "0": "ţĥîîš ĥôôûŕ"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ĥĥŕ.",
          "other": "îñ {0} ĥĥŕ."
        },
        "past": {
          "one": "{0} ĥŕ. ààĝô",
          "other": "{0} ĥŕ. ààĝô"
        }
      }
    },
    "minute": {
      "displayName": "ɱîññûţéé",
      "relative": {
        "0": "ţĥîîš ɱîîñûţţé"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ɱɱîñûûţé",
          "other": "îñ {0} ɱɱîñûûţéšš"
        },
        "past": {
          "one": "{0} ɱîññûţéé àĝôô",
          "other": "{0} ɱîññûţééš àĝĝô"
        }
      }
    },
    "minute-short": {
      "displayName": "ɱîññ.",
      "relative": {
        "0": "ţĥîîš ɱîîñûţţé"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ɱɱîñ.",
          "other": "îñ {0} ɱɱîñ."
        },
        "past": {
          "one": "{0} ɱîññ. àĝôô",
          "other": "{0} ɱîññ. àĝôô"
        }
      }
    },
    "second": {
      "displayName": "šéççôñðð",
      "relative": {
        "0": "ñôŵŵ"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ššéçôôñð",
          "other": "îñ {0} ššéçôôñðšš"
        },
        "past": {
          "one": "{0} šéççôñðð àĝôô",
          "other": "{0} šéççôñððš àĝĝô"
        }
      }
    },
    "second-short": {
      "displayName": "šéçç.",
      "relative": {
        "0": "ñôŵŵ"
      },
      "relativeTime": {
        "future": {
          "one": "îñ {0} ššéç.",
          "other": "îñ {0} ššéç."
        },
        "past": {
          "one": "{0} šéçç. àĝôô",
          "other": "{0} šéçç. àĝôô"
        }
      }
    }
  }
});
addLocaleData({
  locale: "es",
  pluralRuleFunction: function (n, ord) {
    if (ord) return "other";
    return n == 1 ? "one" : "other";
  },
  "fields": {
    "year": {
      "displayName": "año",
      "relative": {
        "0": "este año",
        "1": "el próximo año",
        "-1": "el año pasado"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} año",
          "other": "dentro de {0} años"
        },
        "past": {
          "one": "hace {0} año",
          "other": "hace {0} años"
        }
      }
    },
    "year-short": {
      "displayName": "a",
      "relative": {
        "0": "este año",
        "1": "el próximo año",
        "-1": "el año pasado"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} a",
          "other": "dentro de {0} a"
        },
        "past": {
          "one": "hace {0} a",
          "other": "hace {0} a"
        }
      }
    },
    "month": {
      "displayName": "mes",
      "relative": {
        "0": "este mes",
        "1": "el próximo mes",
        "-1": "el mes pasado"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} mes",
          "other": "dentro de {0} meses"
        },
        "past": {
          "one": "hace {0} mes",
          "other": "hace {0} meses"
        }
      }
    },
    "month-short": {
      "displayName": "m",
      "relative": {
        "0": "este mes",
        "1": "el próximo mes",
        "-1": "el mes pasado"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} m",
          "other": "dentro de {0} m"
        },
        "past": {
          "one": "hace {0} m",
          "other": "hace {0} m"
        }
      }
    },
    "day": {
      "displayName": "día",
      "relative": {
        "0": "hoy",
        "1": "mañana",
        "2": "pasado mañana",
        "-2": "anteayer",
        "-1": "ayer"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} día",
          "other": "dentro de {0} días"
        },
        "past": {
          "one": "hace {0} día",
          "other": "hace {0} días"
        }
      }
    },
    "day-short": {
      "displayName": "d",
      "relative": {
        "0": "hoy",
        "1": "mañana",
        "2": "pasado mañana",
        "-2": "anteayer",
        "-1": "ayer"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} día",
          "other": "dentro de {0} días"
        },
        "past": {
          "one": "hace {0} día",
          "other": "hace {0} días"
        }
      }
    },
    "hour": {
      "displayName": "hora",
      "relative": {
        "0": "esta hora"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} hora",
          "other": "dentro de {0} horas"
        },
        "past": {
          "one": "hace {0} hora",
          "other": "hace {0} horas"
        }
      }
    },
    "hour-short": {
      "displayName": "h",
      "relative": {
        "0": "esta hora"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} h",
          "other": "dentro de {0} h"
        },
        "past": {
          "one": "hace {0} h",
          "other": "hace {0} h"
        }
      }
    },
    "minute": {
      "displayName": "minuto",
      "relative": {
        "0": "este minuto"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} minuto",
          "other": "dentro de {0} minutos"
        },
        "past": {
          "one": "hace {0} minuto",
          "other": "hace {0} minutos"
        }
      }
    },
    "minute-short": {
      "displayName": "min",
      "relative": {
        "0": "este minuto"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} min",
          "other": "dentro de {0} min"
        },
        "past": {
          "one": "hace {0} min",
          "other": "hace {0} min"
        }
      }
    },
    "second": {
      "displayName": "segundo",
      "relative": {
        "0": "ahora"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} segundo",
          "other": "dentro de {0} segundos"
        },
        "past": {
          "one": "hace {0} segundo",
          "other": "hace {0} segundos"
        }
      }
    },
    "second-short": {
      "displayName": "s",
      "relative": {
        "0": "ahora"
      },
      "relativeTime": {
        "future": {
          "one": "dentro de {0} s",
          "other": "dentro de {0} s"
        },
        "past": {
          "one": "hace {0} s",
          "other": "hace {0} s"
        }
      }
    }
  }
});
addLocaleData({
  locale: "es-LA",
  parentLocale: "es"
});
addLocaleData({
  locale: "fr",
  pluralRuleFunction: function (n, ord) {
    if (ord) return n == 1 ? "one" : "other";
    return n >= 0 && n < 2 ? "one" : "other";
  },
  "fields": {
    "year": {
      "displayName": "année",
      "relative": {
        "0": "cette année",
        "1": "l’année prochaine",
        "-1": "l’année dernière"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} an",
          "other": "dans {0} ans"
        },
        "past": {
          "one": "il y a {0} an",
          "other": "il y a {0} ans"
        }
      }
    },
    "year-short": {
      "displayName": "an",
      "relative": {
        "0": "cette année",
        "1": "l’année prochaine",
        "-1": "l’année dernière"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} a",
          "other": "dans {0} a"
        },
        "past": {
          "one": "il y a {0} a",
          "other": "il y a {0} a"
        }
      }
    },
    "month": {
      "displayName": "mois",
      "relative": {
        "0": "ce mois-ci",
        "1": "le mois prochain",
        "-1": "le mois dernier"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} mois",
          "other": "dans {0} mois"
        },
        "past": {
          "one": "il y a {0} mois",
          "other": "il y a {0} mois"
        }
      }
    },
    "month-short": {
      "displayName": "m.",
      "relative": {
        "0": "ce mois-ci",
        "1": "le mois prochain",
        "-1": "le mois dernier"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} m.",
          "other": "dans {0} m."
        },
        "past": {
          "one": "il y a {0} m.",
          "other": "il y a {0} m."
        }
      }
    },
    "day": {
      "displayName": "jour",
      "relative": {
        "0": "aujourd’hui",
        "1": "demain",
        "2": "après-demain",
        "-2": "avant-hier",
        "-1": "hier"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} jour",
          "other": "dans {0} jours"
        },
        "past": {
          "one": "il y a {0} jour",
          "other": "il y a {0} jours"
        }
      }
    },
    "day-short": {
      "displayName": "j",
      "relative": {
        "0": "aujourd’hui",
        "1": "demain",
        "2": "après-demain",
        "-2": "avant-hier",
        "-1": "hier"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} j",
          "other": "dans {0} j"
        },
        "past": {
          "one": "il y a {0} j",
          "other": "il y a {0} j"
        }
      }
    },
    "hour": {
      "displayName": "heure",
      "relative": {
        "0": "cette heure-ci"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} heure",
          "other": "dans {0} heures"
        },
        "past": {
          "one": "il y a {0} heure",
          "other": "il y a {0} heures"
        }
      }
    },
    "hour-short": {
      "displayName": "h",
      "relative": {
        "0": "cette heure-ci"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} h",
          "other": "dans {0} h"
        },
        "past": {
          "one": "il y a {0} h",
          "other": "il y a {0} h"
        }
      }
    },
    "minute": {
      "displayName": "minute",
      "relative": {
        "0": "cette minute-ci"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} minute",
          "other": "dans {0} minutes"
        },
        "past": {
          "one": "il y a {0} minute",
          "other": "il y a {0} minutes"
        }
      }
    },
    "minute-short": {
      "displayName": "min",
      "relative": {
        "0": "cette minute-ci"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} min",
          "other": "dans {0} min"
        },
        "past": {
          "one": "il y a {0} min",
          "other": "il y a {0} min"
        }
      }
    },
    "second": {
      "displayName": "seconde",
      "relative": {
        "0": "maintenant"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} seconde",
          "other": "dans {0} secondes"
        },
        "past": {
          "one": "il y a {0} seconde",
          "other": "il y a {0} secondes"
        }
      }
    },
    "second-short": {
      "displayName": "s",
      "relative": {
        "0": "maintenant"
      },
      "relativeTime": {
        "future": {
          "one": "dans {0} s",
          "other": "dans {0} s"
        },
        "past": {
          "one": "il y a {0} s",
          "other": "il y a {0} s"
        }
      }
    }
  }
});
addLocaleData({
  locale: "fr-FR",
  parentLocale: "fr"
});
addLocaleData({
  locale: "de",
  pluralRuleFunction: function (n, ord) {
    var s = String(n).split("."),
        v0 = !s[1];
    if (ord) return "other";
    return n == 1 && v0 ? "one" : "other";
  },
  "fields": {
    "year": {
      "displayName": "Jahr",
      "relative": {
        "0": "dieses Jahr",
        "1": "nächstes Jahr",
        "-1": "letztes Jahr"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Jahr",
          "other": "in {0} Jahren"
        },
        "past": {
          "one": "vor {0} Jahr",
          "other": "vor {0} Jahren"
        }
      }
    },
    "year-short": {
      "displayName": "Jahr",
      "relative": {
        "0": "dieses Jahr",
        "1": "nächstes Jahr",
        "-1": "letztes Jahr"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Jahr",
          "other": "in {0} Jahren"
        },
        "past": {
          "one": "vor {0} Jahr",
          "other": "vor {0} Jahren"
        }
      }
    },
    "month": {
      "displayName": "Monat",
      "relative": {
        "0": "diesen Monat",
        "1": "nächsten Monat",
        "-1": "letzten Monat"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Monat",
          "other": "in {0} Monaten"
        },
        "past": {
          "one": "vor {0} Monat",
          "other": "vor {0} Monaten"
        }
      }
    },
    "month-short": {
      "displayName": "Monat",
      "relative": {
        "0": "diesen Monat",
        "1": "nächsten Monat",
        "-1": "letzten Monat"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Monat",
          "other": "in {0} Monaten"
        },
        "past": {
          "one": "vor {0} Monat",
          "other": "vor {0} Monaten"
        }
      }
    },
    "day": {
      "displayName": "Tag",
      "relative": {
        "0": "heute",
        "1": "morgen",
        "2": "übermorgen",
        "-2": "vorgestern",
        "-1": "gestern"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Tag",
          "other": "in {0} Tagen"
        },
        "past": {
          "one": "vor {0} Tag",
          "other": "vor {0} Tagen"
        }
      }
    },
    "day-short": {
      "displayName": "Tag",
      "relative": {
        "0": "heute",
        "1": "morgen",
        "2": "übermorgen",
        "-2": "vorgestern",
        "-1": "gestern"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Tag",
          "other": "in {0} Tagen"
        },
        "past": {
          "one": "vor {0} Tag",
          "other": "vor {0} Tagen"
        }
      }
    },
    "hour": {
      "displayName": "Stunde",
      "relative": {
        "0": "in dieser Stunde"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Stunde",
          "other": "in {0} Stunden"
        },
        "past": {
          "one": "vor {0} Stunde",
          "other": "vor {0} Stunden"
        }
      }
    },
    "hour-short": {
      "displayName": "Std.",
      "relative": {
        "0": "in dieser Stunde"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Std.",
          "other": "in {0} Std."
        },
        "past": {
          "one": "vor {0} Std.",
          "other": "vor {0} Std."
        }
      }
    },
    "minute": {
      "displayName": "Minute",
      "relative": {
        "0": "in dieser Minute"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Minute",
          "other": "in {0} Minuten"
        },
        "past": {
          "one": "vor {0} Minute",
          "other": "vor {0} Minuten"
        }
      }
    },
    "minute-short": {
      "displayName": "Min.",
      "relative": {
        "0": "in dieser Minute"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Min.",
          "other": "in {0} Min."
        },
        "past": {
          "one": "vor {0} Min.",
          "other": "vor {0} Min."
        }
      }
    },
    "second": {
      "displayName": "Sekunde",
      "relative": {
        "0": "jetzt"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Sekunde",
          "other": "in {0} Sekunden"
        },
        "past": {
          "one": "vor {0} Sekunde",
          "other": "vor {0} Sekunden"
        }
      }
    },
    "second-short": {
      "displayName": "Sek.",
      "relative": {
        "0": "jetzt"
      },
      "relativeTime": {
        "future": {
          "one": "in {0} Sek.",
          "other": "in {0} Sek."
        },
        "past": {
          "one": "vor {0} Sek.",
          "other": "vor {0} Sek."
        }
      }
    }
  }
});
addLocaleData({
  locale: "de-DE",
  parentLocale: "de"
});
addLocaleData({
  locale: "ja",
  pluralRuleFunction: function (n, ord) {
    if (ord) return "other";
    return "other";
  },
  "fields": {
    "year": {
      "displayName": "年",
      "relative": {
        "0": "今年",
        "1": "翌年",
        "-1": "昨年"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 年後"
        },
        "past": {
          "other": "{0} 年前"
        }
      }
    },
    "year-short": {
      "displayName": "年",
      "relative": {
        "0": "今年",
        "1": "翌年",
        "-1": "昨年"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 年後"
        },
        "past": {
          "other": "{0} 年前"
        }
      }
    },
    "month": {
      "displayName": "月",
      "relative": {
        "0": "今月",
        "1": "翌月",
        "-1": "先月"
      },
      "relativeTime": {
        "future": {
          "other": "{0} か月後"
        },
        "past": {
          "other": "{0} か月前"
        }
      }
    },
    "month-short": {
      "displayName": "月",
      "relative": {
        "0": "今月",
        "1": "翌月",
        "-1": "先月"
      },
      "relativeTime": {
        "future": {
          "other": "{0} か月後"
        },
        "past": {
          "other": "{0} か月前"
        }
      }
    },
    "day": {
      "displayName": "日",
      "relative": {
        "0": "今日",
        "1": "明日",
        "2": "明後日",
        "-2": "一昨日",
        "-1": "昨日"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 日後"
        },
        "past": {
          "other": "{0} 日前"
        }
      }
    },
    "day-short": {
      "displayName": "日",
      "relative": {
        "0": "今日",
        "1": "明日",
        "2": "明後日",
        "-2": "一昨日",
        "-1": "昨日"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 日後"
        },
        "past": {
          "other": "{0} 日前"
        }
      }
    },
    "hour": {
      "displayName": "時",
      "relative": {
        "0": "1 時間以内"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 時間後"
        },
        "past": {
          "other": "{0} 時間前"
        }
      }
    },
    "hour-short": {
      "displayName": "時",
      "relative": {
        "0": "1 時間以内"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 時間後"
        },
        "past": {
          "other": "{0} 時間前"
        }
      }
    },
    "minute": {
      "displayName": "分",
      "relative": {
        "0": "1 分以内"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 分後"
        },
        "past": {
          "other": "{0} 分前"
        }
      }
    },
    "minute-short": {
      "displayName": "分",
      "relative": {
        "0": "1 分以内"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 分後"
        },
        "past": {
          "other": "{0} 分前"
        }
      }
    },
    "second": {
      "displayName": "秒",
      "relative": {
        "0": "今"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 秒後"
        },
        "past": {
          "other": "{0} 秒前"
        }
      }
    },
    "second-short": {
      "displayName": "秒",
      "relative": {
        "0": "今"
      },
      "relativeTime": {
        "future": {
          "other": "{0} 秒後"
        },
        "past": {
          "other": "{0} 秒前"
        }
      }
    }
  }
});
addLocaleData({
  locale: "ja-JP",
  parentLocale: "ja"
});
addLocaleData({
  locale: "ko",
  pluralRuleFunction: function (n, ord) {
    if (ord) return "other";
    return "other";
  },
  "fields": {
    "year": {
      "displayName": "년",
      "relative": {
        "0": "올해",
        "1": "내년",
        "-1": "작년"
      },
      "relativeTime": {
        "future": {
          "other": "{0}년 후"
        },
        "past": {
          "other": "{0}년 전"
        }
      }
    },
    "year-short": {
      "displayName": "년",
      "relative": {
        "0": "올해",
        "1": "내년",
        "-1": "작년"
      },
      "relativeTime": {
        "future": {
          "other": "{0}년 후"
        },
        "past": {
          "other": "{0}년 전"
        }
      }
    },
    "month": {
      "displayName": "월",
      "relative": {
        "0": "이번 달",
        "1": "다음 달",
        "-1": "지난달"
      },
      "relativeTime": {
        "future": {
          "other": "{0}개월 후"
        },
        "past": {
          "other": "{0}개월 전"
        }
      }
    },
    "month-short": {
      "displayName": "월",
      "relative": {
        "0": "이번 달",
        "1": "다음 달",
        "-1": "지난달"
      },
      "relativeTime": {
        "future": {
          "other": "{0}개월 후"
        },
        "past": {
          "other": "{0}개월 전"
        }
      }
    },
    "day": {
      "displayName": "일",
      "relative": {
        "0": "오늘",
        "1": "내일",
        "2": "모레",
        "-2": "그저께",
        "-1": "어제"
      },
      "relativeTime": {
        "future": {
          "other": "{0}일 후"
        },
        "past": {
          "other": "{0}일 전"
        }
      }
    },
    "day-short": {
      "displayName": "일",
      "relative": {
        "0": "오늘",
        "1": "내일",
        "2": "모레",
        "-2": "그저께",
        "-1": "어제"
      },
      "relativeTime": {
        "future": {
          "other": "{0}일 후"
        },
        "past": {
          "other": "{0}일 전"
        }
      }
    },
    "hour": {
      "displayName": "시",
      "relative": {
        "0": "현재 시간"
      },
      "relativeTime": {
        "future": {
          "other": "{0}시간 후"
        },
        "past": {
          "other": "{0}시간 전"
        }
      }
    },
    "hour-short": {
      "displayName": "시",
      "relative": {
        "0": "현재 시간"
      },
      "relativeTime": {
        "future": {
          "other": "{0}시간 후"
        },
        "past": {
          "other": "{0}시간 전"
        }
      }
    },
    "minute": {
      "displayName": "분",
      "relative": {
        "0": "현재 분"
      },
      "relativeTime": {
        "future": {
          "other": "{0}분 후"
        },
        "past": {
          "other": "{0}분 전"
        }
      }
    },
    "minute-short": {
      "displayName": "분",
      "relative": {
        "0": "현재 분"
      },
      "relativeTime": {
        "future": {
          "other": "{0}분 후"
        },
        "past": {
          "other": "{0}분 전"
        }
      }
    },
    "second": {
      "displayName": "초",
      "relative": {
        "0": "지금"
      },
      "relativeTime": {
        "future": {
          "other": "{0}초 후"
        },
        "past": {
          "other": "{0}초 전"
        }
      }
    },
    "second-short": {
      "displayName": "초",
      "relative": {
        "0": "지금"
      },
      "relativeTime": {
        "future": {
          "other": "{0}초 후"
        },
        "past": {
          "other": "{0}초 전"
        }
      }
    }
  }
});
addLocaleData({
  locale: "ko-KR",
  parentLocale: "ko"
});
addLocaleData({
  locale: "zh",
  pluralRuleFunction: function (n, ord) {
    if (ord) return "other";
    return "other";
  },
  "fields": {
    "year": {
      "displayName": "年",
      "relative": {
        "0": "今年",
        "1": "明年",
        "-1": "去年"
      },
      "relativeTime": {
        "future": {
          "other": "{0}年后"
        },
        "past": {
          "other": "{0}年前"
        }
      }
    },
    "year-short": {
      "displayName": "年",
      "relative": {
        "0": "今年",
        "1": "明年",
        "-1": "去年"
      },
      "relativeTime": {
        "future": {
          "other": "{0}年后"
        },
        "past": {
          "other": "{0}年前"
        }
      }
    },
    "month": {
      "displayName": "月",
      "relative": {
        "0": "本月",
        "1": "下个月",
        "-1": "上个月"
      },
      "relativeTime": {
        "future": {
          "other": "{0}个月后"
        },
        "past": {
          "other": "{0}个月前"
        }
      }
    },
    "month-short": {
      "displayName": "月",
      "relative": {
        "0": "本月",
        "1": "下个月",
        "-1": "上个月"
      },
      "relativeTime": {
        "future": {
          "other": "{0}个月后"
        },
        "past": {
          "other": "{0}个月前"
        }
      }
    },
    "day": {
      "displayName": "日",
      "relative": {
        "0": "今天",
        "1": "明天",
        "2": "后天",
        "-2": "前天",
        "-1": "昨天"
      },
      "relativeTime": {
        "future": {
          "other": "{0}天后"
        },
        "past": {
          "other": "{0}天前"
        }
      }
    },
    "day-short": {
      "displayName": "日",
      "relative": {
        "0": "今天",
        "1": "明天",
        "2": "后天",
        "-2": "前天",
        "-1": "昨天"
      },
      "relativeTime": {
        "future": {
          "other": "{0}天后"
        },
        "past": {
          "other": "{0}天前"
        }
      }
    },
    "hour": {
      "displayName": "小时",
      "relative": {
        "0": "这一时间 \u002F 此时"
      },
      "relativeTime": {
        "future": {
          "other": "{0}小时后"
        },
        "past": {
          "other": "{0}小时前"
        }
      }
    },
    "hour-short": {
      "displayName": "小时",
      "relative": {
        "0": "这一时间 \u002F 此时"
      },
      "relativeTime": {
        "future": {
          "other": "{0}小时后"
        },
        "past": {
          "other": "{0}小时前"
        }
      }
    },
    "minute": {
      "displayName": "分钟",
      "relative": {
        "0": "此刻"
      },
      "relativeTime": {
        "future": {
          "other": "{0}分钟后"
        },
        "past": {
          "other": "{0}分钟前"
        }
      }
    },
    "minute-short": {
      "displayName": "分",
      "relative": {
        "0": "此刻"
      },
      "relativeTime": {
        "future": {
          "other": "{0}分钟后"
        },
        "past": {
          "other": "{0}分钟前"
        }
      }
    },
    "second": {
      "displayName": "秒",
      "relative": {
        "0": "现在"
      },
      "relativeTime": {
        "future": {
          "other": "{0}秒钟后"
        },
        "past": {
          "other": "{0}秒钟前"
        }
      }
    },
    "second-short": {
      "displayName": "秒",
      "relative": {
        "0": "现在"
      },
      "relativeTime": {
        "future": {
          "other": "{0}秒后"
        },
        "past": {
          "other": "{0}秒前"
        }
      }
    }
  }
});
addLocaleData({
  locale: "zh-CN",
  parentLocale: "zh"
});