# frozen-string-literal: true

module Sequel
  # Proc that is instance_execed to create the default inflections for both the
  # model inflector and the inflector extension.
  DEFAULT_INFLECTIONS_PROC = proc do
    plural(/$/, 's')
    plural(/s$/i, 's')
    plural(/(alias|(?:stat|octop|vir|b)us)$/i, '\1es')
    plural(/(buffal|tomat)o$/i, '\1oes')
    plural(/([ti])um$/i, '\1a')
    plural(/sis$/i, 'ses')
    plural(/(?:([^f])fe|([lr])f)$/i, '\1\2ves')
    plural(/(hive)$/i, '\1s')
    plural(/([^aeiouy]|qu)y$/i, '\1ies')
    plural(/(x|ch|ss|sh)$/i, '\1es')
    plural(/(matr|vert|ind)ix|ex$/i, '\1ices')
    plural(/([m|l])ouse$/i, '\1ice')

    singular(/s$/i, '')
    singular(/([ti])a$/i, '\1um')
    singular(/(analy|ba|cri|diagno|parenthe|progno|synop|the)ses$/i, '\1sis')
    singular(/([^f])ves$/i, '\1fe')
    singular(/([h|t]ive)s$/i, '\1')
    singular(/([lr])ves$/i, '\1f')
    singular(/([^aeiouy]|qu)ies$/i, '\1y')
    singular(/(m)ovies$/i, '\1ovie')
    singular(/(x|ch|ss|sh)es$/i, '\1')
    singular(/([m|l])ice$/i, '\1ouse')
    singular(/buses$/i, 'bus')
    singular(/oes$/i, 'o')
    singular(/shoes$/i, 'shoe')
    singular(/(alias|(?:stat|octop|vir|b)us)es$/i, '\1')
    singular(/(vert|ind)ices$/i, '\1ex')
    singular(/matrices$/i, 'matrix')

    irregular('person', 'people')
    irregular('man', 'men')
    irregular('child', 'children')
    irregular('sex', 'sexes')
    irregular('move', 'moves')
    irregular('quiz', 'quizzes')
    irregular('testis', 'testes')

    uncountable(%w(equipment information rice money species series fish sheep news))
  end
end
