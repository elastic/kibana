module SemanticLogger
  # Formatting & colors used by optional color formatter
  module AnsiColors
    CLEAR     = "\e[0m"
    BOLD      = "\e[1m"
    BLACK     = "\e[30m"
    RED       = "\e[31m"
    GREEN     = "\e[32m"
    YELLOW    = "\e[33m"
    BLUE      = "\e[34m"
    MAGENTA   = "\e[35m"
    CYAN      = "\e[36m"
    WHITE     = "\e[37m"

    # Maps the log level to a color for colorized formatters
    # Since this map is not frozen, it can be modified as needed
    LEVEL_MAP = {
      trace: MAGENTA,
      debug: GREEN,
      info:  CYAN,
      warn:  BOLD,
      error: RED,
      fatal: RED
    }
  end

end
