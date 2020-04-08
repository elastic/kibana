# encoding: UTF-8

# This file contains data derived from the IANA Time Zone Database
# (http://www.iana.org/time-zones).

module TZInfo
  module Data
    module Definitions
      module Asia
        module Gaza
          include TimezoneDefinition
          
          timezone 'Asia/Gaza' do |tz|
            tz.offset :o0, 8272, 0, :LMT
            tz.offset :o1, 7200, 0, :EET
            tz.offset :o2, 7200, 3600, :EEST
            tz.offset :o3, 7200, 0, :IST
            tz.offset :o4, 7200, 3600, :IDT
            
            tz.transition 1900, 9, :o1, -2185409872, 13042584383, 5400
            tz.transition 1940, 5, :o2, -933645600, 29157377, 12
            tz.transition 1942, 10, :o1, -857358000, 19445315, 8
            tz.transition 1943, 4, :o2, -844300800, 4861631, 2
            tz.transition 1943, 10, :o1, -825822000, 19448235, 8
            tz.transition 1944, 3, :o2, -812685600, 29174177, 12
            tz.transition 1944, 10, :o1, -794199600, 19451163, 8
            tz.transition 1945, 4, :o2, -779853600, 29178737, 12
            tz.transition 1945, 10, :o1, -762656400, 58362251, 24
            tz.transition 1946, 4, :o2, -748310400, 4863853, 2
            tz.transition 1946, 10, :o1, -731127600, 19457003, 8
            tz.transition 1957, 5, :o2, -399088800, 29231621, 12
            tz.transition 1957, 9, :o1, -386650800, 19488899, 8
            tz.transition 1958, 4, :o2, -368330400, 29235893, 12
            tz.transition 1958, 9, :o1, -355114800, 19491819, 8
            tz.transition 1959, 4, :o2, -336790800, 58480547, 24
            tz.transition 1959, 9, :o1, -323654400, 4873683, 2
            tz.transition 1960, 4, :o2, -305168400, 58489331, 24
            tz.transition 1960, 9, :o1, -292032000, 4874415, 2
            tz.transition 1961, 4, :o2, -273632400, 58498091, 24
            tz.transition 1961, 9, :o1, -260496000, 4875145, 2
            tz.transition 1962, 4, :o2, -242096400, 58506851, 24
            tz.transition 1962, 9, :o1, -228960000, 4875875, 2
            tz.transition 1963, 4, :o2, -210560400, 58515611, 24
            tz.transition 1963, 9, :o1, -197424000, 4876605, 2
            tz.transition 1964, 4, :o2, -178938000, 58524395, 24
            tz.transition 1964, 9, :o1, -165801600, 4877337, 2
            tz.transition 1965, 4, :o2, -147402000, 58533155, 24
            tz.transition 1965, 9, :o1, -134265600, 4878067, 2
            tz.transition 1966, 4, :o2, -115866000, 58541915, 24
            tz.transition 1966, 10, :o1, -102643200, 4878799, 2
            tz.transition 1967, 4, :o2, -84330000, 58550675, 24
            tz.transition 1967, 6, :o3, -81313200, 19517171, 8
            tz.transition 1974, 7, :o4, 142380000
            tz.transition 1974, 10, :o3, 150843600
            tz.transition 1975, 4, :o4, 167176800
            tz.transition 1975, 8, :o3, 178664400
            tz.transition 1980, 8, :o4, 334015200
            tz.transition 1980, 9, :o3, 337644000
            tz.transition 1984, 5, :o4, 452556000
            tz.transition 1984, 8, :o3, 462232800
            tz.transition 1985, 4, :o4, 482277600
            tz.transition 1985, 9, :o3, 495579600
            tz.transition 1986, 5, :o4, 516751200
            tz.transition 1986, 9, :o3, 526424400
            tz.transition 1987, 4, :o4, 545436000
            tz.transition 1987, 9, :o3, 558478800
            tz.transition 1988, 4, :o4, 576626400
            tz.transition 1988, 9, :o3, 589323600
            tz.transition 1989, 4, :o4, 609890400
            tz.transition 1989, 9, :o3, 620773200
            tz.transition 1990, 3, :o4, 638316000
            tz.transition 1990, 8, :o3, 651618000
            tz.transition 1991, 3, :o4, 669765600
            tz.transition 1991, 8, :o3, 683672400
            tz.transition 1992, 3, :o4, 701820000
            tz.transition 1992, 9, :o3, 715726800
            tz.transition 1993, 4, :o4, 733701600
            tz.transition 1993, 9, :o3, 747176400
            tz.transition 1994, 3, :o4, 765151200
            tz.transition 1994, 8, :o3, 778021200
            tz.transition 1995, 3, :o4, 796600800
            tz.transition 1995, 9, :o3, 810075600
            tz.transition 1995, 12, :o1, 820447200
            tz.transition 1996, 4, :o2, 828655200
            tz.transition 1996, 9, :o1, 843170400
            tz.transition 1997, 4, :o2, 860104800
            tz.transition 1997, 9, :o1, 874620000
            tz.transition 1998, 4, :o2, 891554400
            tz.transition 1998, 9, :o1, 906069600
            tz.transition 1999, 4, :o2, 924213600
            tz.transition 1999, 10, :o1, 939934800
            tz.transition 2000, 4, :o2, 956268000
            tz.transition 2000, 10, :o1, 971989200
            tz.transition 2001, 4, :o2, 987717600
            tz.transition 2001, 10, :o1, 1003438800
            tz.transition 2002, 4, :o2, 1019167200
            tz.transition 2002, 10, :o1, 1034888400
            tz.transition 2003, 4, :o2, 1050616800
            tz.transition 2003, 10, :o1, 1066338000
            tz.transition 2004, 4, :o2, 1082066400
            tz.transition 2004, 9, :o1, 1096581600
            tz.transition 2005, 4, :o2, 1113516000
            tz.transition 2005, 10, :o1, 1128380400
            tz.transition 2006, 3, :o2, 1143842400
            tz.transition 2006, 9, :o1, 1158872400
            tz.transition 2007, 3, :o2, 1175378400
            tz.transition 2007, 9, :o1, 1189638000
            tz.transition 2008, 3, :o2, 1206655200
            tz.transition 2008, 8, :o1, 1219957200
            tz.transition 2009, 3, :o2, 1238104800
            tz.transition 2009, 9, :o1, 1252015200
            tz.transition 2010, 3, :o2, 1269640860
            tz.transition 2010, 8, :o1, 1281474000
            tz.transition 2011, 3, :o2, 1301608860
            tz.transition 2011, 7, :o1, 1312146000
            tz.transition 2012, 3, :o2, 1333058400
            tz.transition 2012, 9, :o1, 1348178400
            tz.transition 2013, 3, :o2, 1364508000
            tz.transition 2013, 9, :o1, 1380229200
            tz.transition 2014, 3, :o2, 1395957600
            tz.transition 2014, 10, :o1, 1414098000
            tz.transition 2015, 3, :o2, 1427493600
            tz.transition 2015, 10, :o1, 1445547600
            tz.transition 2016, 3, :o2, 1458946800
            tz.transition 2016, 10, :o1, 1477692000
            tz.transition 2017, 3, :o2, 1490396400
            tz.transition 2017, 10, :o1, 1509141600
            tz.transition 2018, 3, :o2, 1521846000
            tz.transition 2018, 10, :o1, 1540591200
            tz.transition 2019, 3, :o2, 1553810400
            tz.transition 2019, 10, :o1, 1572040800
            tz.transition 2020, 3, :o2, 1585260000
            tz.transition 2020, 10, :o1, 1604095200
            tz.transition 2021, 3, :o2, 1616709600
            tz.transition 2021, 10, :o1, 1635544800
            tz.transition 2022, 3, :o2, 1648159200
            tz.transition 2022, 10, :o1, 1666994400
            tz.transition 2023, 3, :o2, 1680213600
            tz.transition 2023, 10, :o1, 1698444000
            tz.transition 2024, 3, :o2, 1711663200
            tz.transition 2024, 10, :o1, 1729893600
            tz.transition 2025, 3, :o2, 1743112800
            tz.transition 2025, 10, :o1, 1761343200
            tz.transition 2026, 3, :o2, 1774562400
            tz.transition 2026, 10, :o1, 1793397600
            tz.transition 2027, 3, :o2, 1806012000
            tz.transition 2027, 10, :o1, 1824847200
            tz.transition 2028, 3, :o2, 1838066400
            tz.transition 2028, 10, :o1, 1856296800
            tz.transition 2029, 3, :o2, 1869516000
            tz.transition 2029, 10, :o1, 1887746400
            tz.transition 2030, 3, :o2, 1900965600
            tz.transition 2030, 10, :o1, 1919196000
            tz.transition 2031, 3, :o2, 1932415200
            tz.transition 2031, 10, :o1, 1950645600
            tz.transition 2032, 3, :o2, 1963864800
            tz.transition 2032, 10, :o1, 1982700000
            tz.transition 2033, 3, :o2, 1995314400
            tz.transition 2033, 10, :o1, 2014149600
            tz.transition 2034, 3, :o2, 2027368800
            tz.transition 2034, 10, :o1, 2045599200
            tz.transition 2035, 3, :o2, 2058818400
            tz.transition 2035, 10, :o1, 2077048800
            tz.transition 2036, 3, :o2, 2090268000
            tz.transition 2036, 10, :o1, 2108498400
            tz.transition 2037, 3, :o2, 2121717600
            tz.transition 2037, 10, :o1, 2140552800
            tz.transition 2038, 3, :o2, 2153167200, 29586101, 12
            tz.transition 2038, 10, :o1, 2172002400, 29588717, 12
            tz.transition 2039, 3, :o2, 2184616800, 29590469, 12
            tz.transition 2039, 10, :o1, 2203452000, 29593085, 12
            tz.transition 2040, 3, :o2, 2216671200, 29594921, 12
            tz.transition 2040, 10, :o1, 2234901600, 29597453, 12
            tz.transition 2041, 3, :o2, 2248120800, 29599289, 12
            tz.transition 2041, 10, :o1, 2266351200, 29601821, 12
            tz.transition 2042, 3, :o2, 2279570400, 29603657, 12
            tz.transition 2042, 10, :o1, 2297800800, 29606189, 12
            tz.transition 2043, 3, :o2, 2311020000, 29608025, 12
            tz.transition 2043, 10, :o1, 2329855200, 29610641, 12
            tz.transition 2044, 3, :o2, 2342469600, 29612393, 12
            tz.transition 2044, 10, :o1, 2361304800, 29615009, 12
            tz.transition 2045, 3, :o2, 2374524000, 29616845, 12
            tz.transition 2045, 10, :o1, 2392754400, 29619377, 12
            tz.transition 2046, 3, :o2, 2405973600, 29621213, 12
            tz.transition 2046, 10, :o1, 2424204000, 29623745, 12
            tz.transition 2047, 3, :o2, 2437423200, 29625581, 12
            tz.transition 2047, 10, :o1, 2455653600, 29628113, 12
            tz.transition 2048, 3, :o2, 2468872800, 29629949, 12
            tz.transition 2048, 10, :o1, 2487708000, 29632565, 12
            tz.transition 2049, 3, :o2, 2500322400, 29634317, 12
            tz.transition 2049, 10, :o1, 2519157600, 29636933, 12
            tz.transition 2050, 3, :o2, 2531772000, 29638685, 12
            tz.transition 2050, 10, :o1, 2550607200, 29641301, 12
            tz.transition 2051, 3, :o2, 2563826400, 29643137, 12
            tz.transition 2051, 10, :o1, 2582056800, 29645669, 12
            tz.transition 2052, 3, :o2, 2595276000, 29647505, 12
            tz.transition 2052, 10, :o1, 2613506400, 29650037, 12
            tz.transition 2053, 3, :o2, 2626725600, 29651873, 12
            tz.transition 2053, 10, :o1, 2644956000, 29654405, 12
            tz.transition 2054, 3, :o2, 2658175200, 29656241, 12
            tz.transition 2054, 10, :o1, 2677010400, 29658857, 12
            tz.transition 2055, 3, :o2, 2689624800, 29660609, 12
            tz.transition 2055, 10, :o1, 2708460000, 29663225, 12
            tz.transition 2056, 3, :o2, 2721679200, 29665061, 12
            tz.transition 2056, 10, :o1, 2739909600, 29667593, 12
            tz.transition 2057, 3, :o2, 2753128800, 29669429, 12
            tz.transition 2057, 10, :o1, 2771359200, 29671961, 12
            tz.transition 2058, 3, :o2, 2784578400, 29673797, 12
            tz.transition 2058, 10, :o1, 2802808800, 29676329, 12
            tz.transition 2059, 3, :o2, 2816028000, 29678165, 12
            tz.transition 2059, 10, :o1, 2834258400, 29680697, 12
            tz.transition 2060, 3, :o2, 2847477600, 29682533, 12
            tz.transition 2060, 10, :o1, 2866312800, 29685149, 12
            tz.transition 2061, 3, :o2, 2878927200, 29686901, 12
            tz.transition 2061, 10, :o1, 2897762400, 29689517, 12
            tz.transition 2062, 3, :o2, 2910981600, 29691353, 12
            tz.transition 2062, 10, :o1, 2929212000, 29693885, 12
            tz.transition 2063, 3, :o2, 2942431200, 29695721, 12
            tz.transition 2063, 10, :o1, 2960661600, 29698253, 12
            tz.transition 2064, 3, :o2, 2973880800, 29700089, 12
            tz.transition 2064, 10, :o1, 2992111200, 29702621, 12
            tz.transition 2065, 3, :o2, 3005330400, 29704457, 12
            tz.transition 2065, 10, :o1, 3024165600, 29707073, 12
            tz.transition 2066, 3, :o2, 3036780000, 29708825, 12
            tz.transition 2066, 10, :o1, 3055615200, 29711441, 12
            tz.transition 2067, 3, :o2, 3068229600, 29713193, 12
            tz.transition 2067, 10, :o1, 3087064800, 29715809, 12
            tz.transition 2068, 3, :o2, 3100284000, 29717645, 12
            tz.transition 2068, 10, :o1, 3118514400, 29720177, 12
            tz.transition 2069, 3, :o2, 3131733600, 29722013, 12
            tz.transition 2069, 10, :o1, 3149964000, 29724545, 12
          end
        end
      end
    end
  end
end
